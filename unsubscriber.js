const http = require('http');
const puppeteer = require('puppeteer');
const fs = require('fs');
const iPhone = puppeteer.devices['iPhone 8'];

const server = http.createServer();
server.listen(1337, 'localhost', () => {
    start();
});

function start() {
    fs.readFile('instaSubsData.txt', 'utf8', function (err, data) {
        let obj = JSON.parse(data);
        (async () => {
            await checkUnSubscribeAndWrite(obj);
        })()
    });
    setInterval(() => {
        fs.readFile('instaSubsData.txt', 'utf8', function (err, data) {
            let obj = JSON.parse(data);
            (async () => {
                await checkUnSubscribeAndWrite(obj);
            })()
        });
    }, 200000);
}

async function checkUnSubscribeAndWrite(obj) {
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
    try {
        const Data = new Date();
        console.log(`(${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()} ${Data.getHours()}:${Data.getMinutes()}:${Data.getSeconds()}) Unsubscriber started`);
        for (var key in obj) {
            let nick = obj[key].nickname;
            if (obj[key].status == false) {
                continue;
            }
            let url = 'https://www.instagram.com' + obj[key].href;
            await page.goto(url);
            // Проверяем профиль. Если у него слишком много подписок или нет постов или мало подписчиков, то это бот скорее всего
            let profileInfo = await getProfileInfo(page);
            if (profileInfo === null) {
                console.log('Переменная isGoodBot вернулась как null. Нужно проверить код...');
            }
            if (!profileInfo['isGoodBot']) {
                delete obj[key];
                let res = JSON.stringify(obj);
                fs.writeFile('instaSubsData.txt', res, function(nick){
                    return function (err) {
                        if (err) {
                            console.log(`${err}`);
                        } else {
                            console.log(nick + ' - плохой аккаунт, пропускаем');
                        }
                    };
                }(nick));
                continue;
            }

            let countSubs = await page.$$eval('span[class="g47SY lOXF2"]', el => {
                try {
                    return el[1].innerHTML;
                } catch (e) {
                    return false;
                }
            });
            if (!countSubs) {
                let errorOfDeletedAcc = await page.$$eval('h2', el => el[0].innerHTML);
                if (errorOfDeletedAcc == 'Sorry, this page isn\'t available.') {
                    delete obj[key];
                    let res = JSON.stringify(obj);
                    fs.writeFile('instaSubsData.txt', res, function(nick){
                        return function (err) {
                            if (err) {
                                console.log(`${err}`);
                            } else {
                                console.log(`Страница ${nick} удалена из инстаграмма. Удаляем из списка`);
                            }
                        };
                    }(nick));
                    continue;
                }
                const Data = new Date();
                console.log(`(${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()} ${Data.getHours()}:${Data.getMinutes()}:${Data.getSeconds()}) ${obj[key].href} Инста блочит, отрубаем.`);
                break;
            }
            let check = await page.$('button[class="_5f5mN    -fzfL     _6VtSN     yZn4P   "]');
            if (check) {
                await page.click('button[class="_5f5mN    -fzfL     _6VtSN     yZn4P   "]');
                await page.waitForSelector('button[class="aOOlW -Cab_   "]');
                await page.click('button[class="aOOlW -Cab_   "]');
            } else {
                delete obj[key];
                let res = JSON.stringify(obj);
                fs.writeFile('instaSubsData.txt', res, function(nick){
                    return function (err) {
                        if (err) {
                            console.log(`${err}`);
                        } else {
                            console.log(`Не засабскрайблены на ${nick}. Удаляем из списка`);
                            console.log(`Ждем 3 мин.`);
                        }
                    };
                }(nick));
                break;
            }
            delete obj[key];
            let res = JSON.stringify(obj);
            fs.writeFile('instaSubsData.txt', res, function(nick){
                return function (err) {
                    if (err) {
                        console.log(`${err}`);
                    } else {
                        console.log(`Unsubscribed ${nick}. Удаляем из списка`);
                        console.log(`Ждем 3 мин.`);
                    }
                };
            }(nick));
            break;
        }
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
