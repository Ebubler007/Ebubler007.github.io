const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODQ5LCJleHAiOjE2OTM0MjA5NDIsImlhdCI6MTY5MjgxNjE0Mn0.tmCoVyFNGQ-qlmYx6v2D_ivT4gxxawfrWZW-lW4vQuM";
const ukey = "6f63de85-9e75-47c7-9583-19020773392b";

const paymentsUrl = "https://api.cryptocards.ws/payments";
const myHeaders = {
    'X-Token': token,
    'X-Ukey': ukey
};


const params = {
    "id": null,
    "active": true,
    "bank": null,
    "canceled": false,
    "card": null,
    "page": 1,
    "success": false
};

const staticParams = {
    "id": null,
    "active": true,
    "bank": null,
    "canceled": false,
    "card": null,
    "page": 1,
    "success": true
};

function getInfo() {
    $.ajax({
        url: "https://api.cryptocards.ws/payments",
        type: "POST",
        headers: myHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify(params),
        success: function (response) {
            let payments = response.payments;
            let containter = $('#test1');
            containter.html("");
            payments.forEach(function (element) {
                if (element.substatus == 0) {
                    let stavka = Math.round(1e4 * element.income / element.amount_in_cur) / 100;
                    let date = new Date(Date.parse(element.created_at));

                    containter.append(`
                    <tr>
                        <td>${element.id}</td>
                        <td>${element.label}</td>
                        <td>${element.amount}</td>
                        <td>${stavka}%</td>
                        <td>${date.toLocaleTimeString()}</td>
                    </tr>
                    `);
                }
            });
        }
    });

}

function getPercentage() {
    $('#percentage').html("Получение процента...");
    $.ajax({
        url: "https://api.cryptocards.ws/rates",
        type: "GET",
        headers: {
            'X-Token': token,
            'X-Ukey': ukey
        },
        contentType: "application/json",
        dataType: "JSON",
        success: function (response) {
            $('#percentage').html(`Текущий процент: ${response[0].myRate}`)
        }
    });
}

function changePercentage() {
    $.ajax({
        url: "https://api.cryptocards.ws/rates",
        type: "GET",
        headers: myHeaders,
        contentType: "application/json",
        dataType: "JSON",
        success: function (response) {
            let val;
            if (response[0].myRate == 2) {
                val = 0.1;
            } else {
                val = 2;
            }

            $.ajax({
                url: "https://api.cryptocards.ws/rate/ru",
                type: "POST",
                headers: {
                    'X-Token': token,
                    'X-Ukey': ukey
                },
                contentType: "application/json",
                dataType: "JSON",
                data: JSON.stringify({ rate: '' + val }),
                success: getPercentage
            });

        }
    });
}

let memoryTime = 0;

let counter = 0, maxCounter = 15;


function setMemoryTime(val) {
    if (val > memoryTime) {
        memoryTime = val;
        turboLog("#message", "Новая сделка!");
    }
    return;
}

let timerId;

function turboLog(a, b) {
    $(a).html(b);
}

function turboGet() {
    getInfo();
    turboLog('#timer', counter);

    // каждую секунду пуляется запрос на получение сделок
    $.ajax({
        url: paymentsUrl,
        type: "POST",
        headers: myHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify(params),
        success: function (response) {
            let payments = response.payments;

            // если пришла сделка
            if (payments[0]) {
                // обнуляем ИСКУСТВЕННЫЙ таймер
                counter = 0;
                turboLog("#message", "Сделки есть!");

                // вычисляем время последней сделки
                let currentDate = new Date(), createdAt = new Date(payments[0].created_at);

                // запоминаем время последней сделки
                setMemoryTime(createdAt);

                // находим разницу между ВРЕМЕНЕМ СИСТЕМЫ и ВРЕМЕНЕМ ПОСЛЕДНЕЙ СДЕЛКИ
                let difference = (currentDate - memoryTime) / (1000 * 60);

                turboLog("#difference", difference);

                difference = Math.trunc(difference);

                // если с последней сделки прошло более 2 минут
                if (difference > 2) {
                    // запускаем ИЗМЕНЕНИЕ ПРОЦЕНТА
                    turboChange();
                }
                // если не прошло то процент не меняем
            } else {
                // если сделок нету
                turboLog("#message", "Сделок пока нет.");

                // увеличиваем наш ИСКУСТВЕННЫЙ ТАЙМЕР
                counter++;

                // когда прошло 15 секунд БЕЗ СДЕЛОК (РАЗГОН)
                if (counter == maxCounter) {
                    turboCircle();
                }

            }

        }
    });
}

function turboCircle() {
    turboLog('#message', "Разогнался! Сделок пока нет.");
    clearInterval(timerId);
    counter = 0;
    changePercentage();
    timerId = setInterval(() => {
        turboLog("#timer", counter);
        counter++;
        $.ajax({
            url: paymentsUrl,
            type: "POST",
            headers: myHeaders,
            contentType: "application/json",
            dataType: "JSON",
            data: JSON.stringify(params),
            success: function (response) {
                let payments = response.payments;

                // 2 * 15 = 30 т.е. по 30 сек будет держать получается процент
                if (counter == 4 * maxCounter) {
                    turboLog("#message", "Нет пока сделок.");
                    changePercentage();
                    counter = 0;
                    clearInterval(timerId);
                    timerId = setInterval(turboGet, 1000);
                    return;
                }

                if (payments[0]) {
                    turboLog("#message", "Нашел сделку!");
                    changePercentage();
                    counter = 0;
                    clearInterval(timerId);
                    timerId = setInterval(turboGet, 1000);
                    return;
                }
            }
        })
    }, 1000);

}

function turboChange() {
    turboLog("#message", "Сделки есть, но новых нет.");
    changePercentage();
    clearInterval(timerId);
    timerId = setInterval(() => {
        turboLog("#timer", counter);
        counter++;
        $.ajax({
            url: paymentsUrl,
            type: "POST",
            headers: myHeaders,
            contentType: "application/json",
            dataType: "JSON",
            data: JSON.stringify(params),
            success: function (response) {
                let payments = response.payments;


                // 2 * 15 = 30 типо чувствует пока так потом надо какую-то формулу на случайное число что ли хз
                if (counter == 4 * maxCounter) {
                    turboLog("#message", "Нет пока сделок. Но скоро будет.");
                    changePercentage();
                    counter = 0;
                    clearInterval(timerId);
                    timerId = setInterval(turboGet, 1000);
                    return;
                }


                if (payments[0]) {
                    let currentDate = new Date(), createdAt = new Date(payments[0].created_at);
                    let difference = Math.trunc((currentDate - createdAt) / (1000 * 60));

                    if (difference < 2) {
                        turboLog("#message", "Нашел сделку!");
                        changePercentage();
                        counter = 0;
                        clearInterval(timerId);
                        timerId = setInterval(turboGet, 1000);
                        return;
                    }
                }



            }
        })
    }, 1000);
}

function getStatistic() {
    $.ajax({
        url: paymentsUrl,
        type: "POST",
        headers: myHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify(staticParams),
        success: function (response) {
            let payments = response.payments;
            let successess = 0, faileses = 0;
            payments.forEach(function (element) {
                let stavka = Math.round(1e4 * element.income / element.amount_in_cur) / 100;
                if (stavka > 1) {
                    successess++;
                }else{
                    faileses++;
                }
            });
            turboLog("#successes", successess);
            turboLog("#faileses", faileses);
        }
    })

}


$(document).ready(function () {
    $('.spinner-border').hide();
    $('#monitoring').on('click', function () {
        let val = $(this).val();
        switch (val) {
            case 'off': {
                $(this).val('on');
                $(this).html("Отключить");
                $('#monitoring_status').html("Включен");
                $('#monitoring_spinner').show();
                setInterval(getInfo, 1000);
                break;
            }
            case 'on': {
                location.reload();
                break;
            }
        }
    });

    $('#change').on('click', changePercentage);



    $('#turbo').on('click', function () {
        let val = $(this).data('val');

        switch (val) {
            case 1: {
                $(this).data('val', 2);
                $(this).html("Turbo ON");
                $('#turbo_status').show();

                timerId = setInterval(turboGet, 1000);

                // console.log(123);
                break;
            }
            case 2: {
                $(this).data('val', 1);

                clearInterval(timerId);

                $(this).html("Turbo OFF");
                $('#turbo_status').hide();
                // console.log(456);
                break;
            }
        }


    })




    getInfo();
    getPercentage();
    setInterval(getStatistic, 3000);
});


