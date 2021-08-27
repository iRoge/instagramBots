const http = require('http');
const puppeteer = require('puppeteer');
const fs = require('fs');
const iPhone = puppeteer.devices['iPhone SE'];

start();

function start() {
    fs.readFile('instaSubsData.txt', 'utf8', function (err, data) {
        let obj = JSON.parse(data);
        (async () => {
            await like(obj);
        })()
    });
    setInterval(() => {
        fs.readFile('instaSubsData.txt', 'utf8', function (err, data) {
            let obj = JSON.parse(data);
            (async () => {
                await like(obj);
            })()
        });
    }, 300000);
}

async function like(obj) {
    const browser = await puppeteer.launch({
        // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args:[
            '--start-maximized',
            "--disable-notifications",
        ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080});
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
        },
    ];
    await page.setCookie(...cookie);
    try {
        const Data = new Date();
        console.log(`(${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()} ${Data.getHours()}:${Data.getMinutes()}:${Data.getSeconds()}) Лайкер запущен`);
        let i = 0;
        main: for (let key in obj) {
            // Проверяем обработан человек или нет
            if (obj[key].status == true || obj[key].noPostsToLike === true) {
                continue;
            }
            let nick = obj[key].nickname;
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
            // Проверяем подписаны ли мы уже
            let checkIfSubed = await page.$('button[class="_5f5mN    -fzfL     _6VtSN     yZn4P   "]');
            let checkIfSentRequestForSub =  await page.$('button[class=" ffKix sqdOP  L3NKy _4pI4F   _8A5w5    "]');
            if (checkIfSubed || checkIfSentRequestForSub) {
                obj[key].status = true;
                let res = JSON.stringify(obj);
                fs.writeFile('instaSubsData.txt', res, function(err) {
                    if (err) {
                        console.log(`${err}`);
                    } else {
                        console.log(`Ошибка у ${obj[key].nickname}, уже были подписаны на него, ставим статус true`);
                    }
                });
                continue;
            }
            // Проверка количества подписчиков (если больше 1500 пропускаем чела)
            let countSubs = await page.$$eval('span.g47SY', el => {
                try {
                    return el[1].innerHTML;
                } catch (e) {
                    return false;
                }
            });
            if (!countSubs) {
                let errorOfDeletedAcc = await page.$$eval('h2', el => el[0].innerHTML);
                if (errorOfDeletedAcc == 'Sorry, this page isn\'t available.' || errorOfDeletedAcc == 'К сожалению, эта страница недоступна.') {
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
                    continue main;
                }
                const Data = new Date();
                console.log(`(${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()} ${Data.getHours()}:${Data.getMinutes()}:${Data.getSeconds()}) ${obj[key].href} Инста блочит, отрубаем.`);
                break;
            }
            countSubs = await countSubs.replace(/\s/g, '');
            if (countSubs > 1500) {
                delete obj[key];
                let res = JSON.stringify(obj);
                fs.writeFile('instaSubsData.txt', res, function(nick){
                    return function (err) {
                        if (err) {
                            console.log(`${err}`);
                        } else {
                            console.log(`Страница ${nick} имеет более 1500 подписчиков. Удаляем из списка`);
                        }
                    };
                }(nick));
                continue;
            }
            // Собираем и лайкаем 3 поста (или меньше, если нету 3-ех, или пропускаем если нету вообще)
            let postsDivs = await page.$$eval('div[class="v1Nh3 kIKUG  _bz0w"] a', el => {
                return el[0] ? el[1] ? el[2] ? [el[0].getAttribute('href'), el[1].getAttribute('href'), el[2].getAttribute('href')] : [el[0].getAttribute('href'), el[1].getAttribute('href')] : [el[0].getAttribute('href')] : false;
            });
            if (postsDivs) {
                for(let i = 0; i < postsDivs.length; i++) {
                    await page.goto('https://www.instagram.com' + postsDivs[i]);
                    let checkLike = await page.$('span.fr66n svg[aria-label="Нравится"]');
                    if (!checkLike) {
                        continue;
                    }
                    await page.click('span.fr66n svg[aria-label="Нравится"]');
                    await page.waitForTimeout(1000);
                    checkLike = await page.$('span.fr66n svg[aria-label="Не нравится"]');
                    if (!checkLike) {
                        console.log(`Ошибка при попытке лайкнуть пост` + postsDivs[i]);
                        break main;
                    }
                }
            } else {
                obj[key].noPostsToLike = true;
                let res = JSON.stringify(obj);
                fs.writeFile('instaSubsData.txt', res, function(err) {
                    if (err) {
                        console.log(`${err}`);
                    } else {
                        console.log(`Нет постов, чтобы лайкнуть у ${obj[key].nickname}. Делаем свойство noPostsToLike на true и ждем 6 мин`);
                        console.log(`Ждем 6 мин.`);
                    }
                });
                break;
            }
            obj[key].status = true;
            let res = JSON.stringify(obj);
            fs.writeFile('instaSubsData.txt', res, function(err) {
                if (err) {
                    console.log(`${err}`);
                } else {
                    console.log(`Пролайкан ${obj[key].nickname}`);
                    console.log(`Ждем 6 мин.`);
                }
            });
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
