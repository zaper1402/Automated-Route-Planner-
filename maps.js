const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require("path");

let locFile = process.argv[2];//location file
let mode = process.argv[3];// mode of commute

let MinRouteArr = [], Mintime = Number.MAX_VALUE, duration;
(async function ReadCred() {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            slowMo: 20,

            args: ['--start-maximized', '--disable-notifications']
        });
        //read loc file 
        let locFileStr = await fs.promises.readFile(locFile, "utf-8");
        let locJSON = JSON.parse(locFileStr);
        let startPt = locJSON.startPt;
        let endPt = locJSON.endPt;
        let URL = locJSON.URL;
        let locs = locJSON.stopages;

        //permutations
        let locPermute = perm(locs);
        console.log("Possible Routes -  "+locPermute.length);

        let i=0;
        
        do{
            
            let Route = [];
            let idx = 0;

            //routeformation
            Route.push(startPt);
            if(locPermute.length>0) Route = Route.concat(locPermute[i]);
            Route.push(endPt);
            // console.log(Route);

            //open url
            let pages = await browser.pages();
            let page = pages[0];
            await page.setDefaultNavigationTimeout(0);

            page.goto(URL, {
                waitUntil: 'networkidle2'
            });

            await page.waitForSelector("#directions-searchbox-0", { visible: true });

            //stops 
            for (idx = 0; idx <Route.length; idx++) {
                await addStops(page, Route[idx], idx);
            }

            //mode of transport
            switch(mode) {
                case "car":
                  // code block
                  await  page.click('div[data-travel_mode="0"]');
                  break;
                case "public transport":
                  // code block
                  await  page.click('div[data-travel_mode="3"]');
                  break;
                case "cycling":
                    await  page.click('div[data-travel_mode="1"]');
                    break;
                case "walking":
                    await  page.click('div[data-travel_mode="2"]');
                    break;
                default:
                    await  page.click('div[data-travel_mode="0"]');
            }
            await page.waitForSelector('div[class="section-directions-trip-numbers"]', { visible: true });


            //time calculation 
            let sectionArr = await page.$$('div[class="section-directions-trip-numbers"]');
            // await page.waitForSelector(".section-directions-trip-duration span", { visible: true });
            let timeObj = await sectionArr[0].$('.section-directions-trip-duration span');
            let time = await timeObj.evaluate(el => el.textContent, timeObj);
            let time2 = time.replace(/\s/g, '');


            //time in min
            let timeinMin;
            let timeArr = time2.split("h");

            if (time.includes('h')) {
                timeArr[1] = timeArr[1].replace(/[a-zA-Z]/g, '');
                timeinMin = timeArr[0] * 60 + parseInt(timeArr[1]);
            }
            else {
                timeinMin = timeArr[0].replace(/[a-zA-Z]/g, '');
            }

            //update min time 
            if (Mintime > timeinMin) {
                MinRouteArr = Route.slice();
                Mintime = timeinMin;
                duration = time;
            }
            console.log(`Route - ${i} : ` + Route);
            console.log(`Time - ${i} :  `+ time);
            console.log("--------------------------------------------------");
            i++;
        }while(i < locPermute.length)

        console.log("Best Route -   "+MinRouteArr);
        console.log(duration);





    } catch (err) {
        console.log(err);
    }




})();


async function addStops(page, stop, idx) {
    try{
    //click add destination 
    if (idx > 1) {
        await page.waitForSelector(".widget-directions-searchbox-container", { visible: true });
        await page.click(`button.widget-directions-searchbox-container`);
        await page.waitForSelector(`#directions-searchbox-${idx} input`, { visible: true });
    }

    //update
    // console.log(stop);
    // console.log(idx);
    await page.click(`#directions-searchbox-${idx} input`);
    await page.keyboard.type(stop);
    await page.keyboard.press('Enter');
    }catch(err){

    }
}

function perm(xs) {
    let ret = [];

    for (let i = 0; i < xs.length; i = i + 1) {
        let rest = perm(xs.slice(0, i).concat(xs.slice(i + 1)));

        if (!rest.length) {
            ret.push([xs[i]])
        } else {
            for (let j = 0; j < rest.length; j = j + 1) {
                ret.push([xs[i]].concat(rest[j]))
            }
        }
    }
    return ret;
}
