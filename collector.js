const http = require('http');
const puppeteer = require('puppeteer');
const fs = require('fs');
const iPhone = puppeteer.devices['iPhone 6'];


start();

function start() {
    const Data = new Date();
    console.log(`(${Data.getDate()}.${Data.getMonth()}.${Data.getFullYear()} ${Data.getHours()}:${Data.getMinutes()}:${Data.getSeconds()}) Начинаем следующую итерацию`);
    let data = fs.readFileSync('instaSubsData.txt');
    let obj = JSON.parse(data);
    (async () => {
        await console.log(`Collecting started`);
        const arGroups = [
            '/sexology_with_nataly/'
        ];
        for (let group of arGroups) {
            obj = await getNewClients(obj, group);
            let res = await JSON.stringify(obj);
            fs.writeFileSync('instaSubsData.txt', res);
            await console.log(`Collecting ${group} ended`);
        }
        await console.log(`Collecting ended`);
    })();
}

async function getNewClients(obj, groupUrl) {
    const browser = await puppeteer.launch({
        // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        headless: true
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
        console.log(`Analyzing ${groupUrl} ...`);
        let url = 'https://www.instagram.com' + groupUrl;
        await page.emulate(iPhone);
        await page.goto(url);
        for (let i = 0; i < 15; i++) {
            await page.waitForTimeout(150);
            await page.evaluate(() => {
                window.scrollBy(0, 100);
            });
        }
        await page.waitForTimeout(500);
        let hrefs = await page.evaluate(
            () => Array.from(
                document.querySelectorAll('div[class="v1Nh3 kIKUG  _bz0w"] a'),
                a => a.getAttribute('href')
            )
        );
        let postPauser = 0;
        for (let i = 0; i < hrefs.length; i++) {
            await console.log(`Итерируем следующий пост ${hrefs[i]}`);
            if (((i + 1) % 40) == 0) {
                await console.log(`Итерация 40 постов прошла, ждем 6 мин.`);
                await page.waitForTimeout(350000);
            }
            await page.goto('https://www.instagram.com' + hrefs[i]);
            let checkIfVideoPost = await page.$$('span[class="vcOH2"]');
            if (checkIfVideoPost.length) {
                await console.log(`Это видос(`);
                continue;
            }

            let checkOutIfSomeOfFriendLikedPost = await page.$$('div[class="                  Igw0E _56XdI          eGOV_         _4EzTm                                       ItkAi                                                                       "]');
            let likesCount;
            if (checkOutIfSomeOfFriendLikedPost.length) {
                likesCount = await page.$$eval('a.zV_Nj span', el => el[1].innerHTML);
            } else {
                likesCount = await page.$$eval('a.zV_Nj span', el => el[0].innerHTML);
            }
            likesCount = await likesCount.replace(/\s/g, '');
            likesCount = await likesCount.replace(/,/g, '');
            await page.waitForSelector('a.zV_Nj');
            await page.evaluate(() => {
                window.scrollBy(0, 500);
            });
            await page.click('a.zV_Nj');
            await page.waitForTimeout(1500);
            let clientsDivs = await page.$$('div[class="                     Igw0E   rBNOH        eGOV_     ybXk5    _4EzTm                                                                                   XfCBB          HVWg4                 "]');
            let forPause = 1;
            console.log('Кол-во лайков поста ' + likesCount);
            let antiStoper = 0;
            let privLength = 0;
            for (let m = 0; likesCount > clientsDivs.length; m++) {
                if (clientsDivs.length - forPause*600 > 0) {
                    await console.log(`Итерация 500 лайков прошла, ждем 6 мин.`);
                    await page.waitForTimeout(60000);
                    await console.log(`5мин..`);
                    await page.waitForTimeout(60000);
                    await console.log(`4мин..`);
                    await page.waitForTimeout(60000);
                    await console.log(`3мин..`);
                    await page.waitForTimeout(60000);
                    await console.log(`2мин..`);
                    await page.waitForTimeout(60000);
                    await console.log(`1мин..`);
                    await page.waitForTimeout(60000);
                    forPause += 1;
                }
                await page.waitForTimeout(150);
                clientsDivs = await page.$$('div[class="                     Igw0E   rBNOH        eGOV_     ybXk5    _4EzTm                                                                                   XfCBB          HVWg4                 "]');
                await page.evaluate((iterScrollHeight) => {
                    window.scrollBy(0, iterScrollHeight);
                }, m * 100);
                if (privLength == clientsDivs.length) {
                    antiStoper++;
                } else {
                    antiStoper = 0;
                }
                if (antiStoper >= 10) {
                    break;
                }
                privLength = clientsDivs.length;
            }
            console.log('Загружено лайкеров поста ' + clientsDivs.length);
            let clientsData = await page.evaluate(
                () => Array.from(
                    document.querySelectorAll('div[class="_7UhW9   xLCgt      MMzan  KV-D4              fDxYl     "] a'),
                    a => [a.getAttribute('title'), a.getAttribute('href')]
                ),
            );
            for (let n = 0; n < clientsData.length; n++) {
                if (clientsData[n][0] in obj) {
                    obj[clientsData[n][0]].numberOfLikes = obj[clientsData[n][0]].numberOfLikes + 1;
                    continue;
                }
                obj[clientsData[n][0]] = {
                    numberOfLikes: 1,
                    nickname: clientsData[n][0],
                    href: clientsData[n][1],
                    status: false,
                };
                await console.log(`Added ${clientsData[n][0]}`);
            }

            postPauser += clientsDivs.length;
            if (postPauser >= 500) {
                await console.log(`Итерация поста прошла и собрано больше 500 лайкеров, ждем 6 мин.`);
                await page.waitForTimeout(60000);
                await console.log(`5мин..`);
                await page.waitForTimeout(60000);
                await console.log(`4мин..`);
                await page.waitForTimeout(60000);
                await console.log(`3мин..`);
                await page.waitForTimeout(60000);
                await console.log(`2мин..`);
                await page.waitForTimeout(60000);
                await console.log(`1мин..`);
                await page.waitForTimeout(60000);
                postPauser = 0;
            } else {
                await console.log(`Итерация поста прошла.`);
            }
        }
        await browser.close();
        return obj;
    } catch (error) {
        await console.log(`${error}`);
        await browser.close();
        return obj;
    }
}
