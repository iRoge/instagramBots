const http = require('http');
const puppeteer = require('puppeteer');
const fs = require('fs');
const iPhone = puppeteer.devices['iPhone 8'];

start();

async function start() {
    await checkUnSubscribeAndWrite();
}

async function checkUnSubscribeAndWrite() {
    const browser = await puppeteer.launch({
        // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent('5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

    await page.emulate(iPhone);

    let cookie = [
        {
            "domain": ".instagram.com",
            "expirationDate": 1597288045,
            "hostOnly": false,
            "httpOnly": false,
            "name": "sessionid",
            "path": "/",
            "sameSite": "no_restriction",
            "secure": false,
            "session": true,
            "storeId": "0",
            "value": "48207879907%3AfAQ6tvxeUQxDNd%3A29",
            "id": 1
        }
    ];
    await page.setCookie(...cookie);
    let url = 'https://www.instagram.com/orgasmcity.ru/';
    await page.goto(url);
    try {
        // Сохраняем количество подписчиков в переменную
        let subscribersCount = await page.$$eval('span[class="g47SY lOXF2"]', el => {
            try {
                return el[1].innerHTML.replace(' ', '');
            } catch (e) {
                return false;
            }
        });
        // Переходим в список подписчиков
        await page.click('a[class=" _81NM2"]');
        const Data = new Date();
        console.log(`(${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()} ${Data.getHours()}:${Data.getMinutes()}:${Data.getSeconds()}) Bot started`);
        // Ждем загрузку подписчиков
        await page.waitForSelector('a.FPmhX');

        await page.waitForTimeout(1000);
        let openedAccountsCount = 0;
        let sameCountOfAccountsIterationsNumber = 0;
        let scrollLength = 300;
        // Скроллим страницу, пока не покажет всех подписчиков,
        // или пока задержка между получением нового блока подписчиков не будет какое-то время
        while (openedAccountsCount < subscribersCount) {
            await page.waitForTimeout(300);
            await page.evaluate((scrollLength) => {
                window.scrollBy(0, scrollLength);
            }, scrollLength);
            scrollLength += 300;
            let thisIterCount = (await page.$$('a.FPmhX')).length;
            if (thisIterCount == openedAccountsCount) {
                sameCountOfAccountsIterationsNumber++;
            }
            if (sameCountOfAccountsIterationsNumber > 90) {
                break;
            }
            openedAccountsCount = thisIterCount;
        }

        // На отскролленной странице получаем логины аккаунтов всех подписчиков
        let arSubscribers = await page.$$eval('a.FPmhX', el => {
            try {
                let arSubscribers = [];
                for (let sub of el) {
                    arSubscribers.push(sub.innerHTML);
                }
                return arSubscribers;
            } catch (e) {
                return false;
            }
        });
        console.log('Закончен сбор подписчиков. Начинаем блокировать плохих ботов. Количество подписчиков - ' + arSubscribers.length + ' шт.');
        let countBadBots = 0;
        for (let subLogin of arSubscribers) {
            let url = 'https://www.instagram.com/' + subLogin + '/';
            await page.goto(url);
            let subInfo;
            try {
                subInfo = await getProfileInfo(page);
            } catch (e) {
                console.log('Данные об аккаунте ' + subLogin + ' не были получены в течении 30 секунд... Ждем 30 минут и пропускаем')
                await page.waitForTimeout(1800000);
                continue;
            }

            if (subInfo !== null) {
                if (subInfo['isGoodBot']) {
                    console.log(
                        'Логин: ' + subLogin
                        + ' , количество постов: ' + subInfo['cntPosts']
                        + ' , количество сабов: ' + subInfo['cntSubs']
                        + ' , количество подписок: ' + subInfo['cntFollows']
                        + ' . Вывод - ХОРОШИЙ ПОДПИСЧИК'
                    );
                } else {
                    console.log(
                        'Логин: ' + subLogin
                        + ' , количество постов: ' + subInfo['cntPosts']
                        + ' , количество сабов: ' + subInfo['cntSubs']
                        + ' , количество подписок: ' + subInfo['cntFollows']
                        + ' . Вывод - ПЛОХОЙ БОТ'
                    );
                    countBadBots++;
                    // Блокируем подписчика

                    await page.waitForSelector('button[class="wpO6b  "]');
                    await (await page.$('button[class="wpO6b  "]')).click();
                    await page.waitForSelector('button[class="aOOlW -Cab_   "]');
                    await ((await page.$$('button[class="aOOlW -Cab_   "]'))[0]).click();
                    await page.waitForSelector('button[class="aOOlW  bIiDR  "]');
                    await (await page.$('button[class="aOOlW  bIiDR  "]')).click();
                    let checkIfBlocked = null;
                    for (let i = 0; i < 10; i++) {
                        checkIfBlocked = await page.$('p.gxNyb');
                        if (checkIfBlocked) {
                            break;
                        }
                        await page.waitForTimeout(500);
                    }
                    if (!checkIfBlocked) {
                        console.log('Закончился лимит на блокировку, ждем 7.5 мин');
                        await page.waitForTimeout(450000);
                    }
                }
            } else {
                console.log('Переменная isGoodBot вернулась как null. Нужно проверить код...');
            }
        }
        let round = function(number) {
            return Math.round(parseFloat(number) * 100) / 100;
        }
        console.log('Все подписчики просканированы. Из '
            + arSubscribers.length + ' подписчиков, ' + countBadBots + ' - плохие боты, что составляет ' + round((100*countBadBots/arSubscribers.length)) + '%');
        await browser.close();
    } catch (error) {
        const Data = new Date();
        console.log(`(${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()} ${Data.getHours()}:${Data.getMinutes()}:${Data.getSeconds()}) ${error}`);
        await browser.close();
    }
}

async function getProfileInfo(page) {
    await page.waitForSelector('span.g47SY');
    return await page.$$eval('span.g47SY', el => {
        let isNumber = (value) => !!value.match(/^\d+$/);
        try {
            let countPosts = el[0].innerHTML.replace(/\s/g, '');
            let countSubs = el[1].innerHTML.replace(/\s/g, '');
            let countFollows = el[2].innerHTML.replace(/\s/g, '');
            let object = {
                cntPosts: countPosts,
                cntSubs: countSubs,
                cntFollows: countFollows,
                isGoodBot: true,
            };
            // Если количество постов = 0 и количество сабов меньше 10, а количество подписок больше 100 - то это плохой бот
            if (!isNumber(countPosts)) {
                return object;
            }
            if (!isNumber(countFollows)) {
                object['isGoodBot'] = false;
                return object;
            }

            if (countPosts == 0) {
                if (isNumber(countSubs) && (countFollows > 100)) {
                    object['isGoodBot'] = false;
                    return object;
                }
            } else if (countPosts < 12) {
                if (isNumber(countSubs) && ((countFollows - countSubs) > 250)) {
                    object['isGoodBot'] = false;
                    return object;
                }
            } else {
                if (isNumber(countSubs) && ((countFollows - countSubs) > 2000)) {
                    object['isGoodBot'] = false;
                    return object;
                }
            }

            object['isGoodBot'] = true;
            return object;
        } catch (e) {
            return null;
        }
    });
}

