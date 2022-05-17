const puppeteer = require('puppeteer')
const fs = require("fs/promises");
const fsPromises = require('fs').promises
async function start() {

    processPages("https://clutch.co/directory/mobile-application-developers",
        "/Users/macbook/IdeaProjects/crawler/app/data1.csv", 1, 150)
    processPages("https://clutch.co/directory/mobile-application-developers",
        "/Users/macbook/IdeaProjects/crawler/app/data2.csv", 150, 300)
    processPages("https://clutch.co/directory/mobile-application-developers",
        "/Users/macbook/IdeaProjects/crawler/app/data3.csv", 300, 450)
    processPages("https://clutch.co/directory/mobile-application-developers",
        "/Users/macbook/IdeaProjects/crawler/app/data4.csv", 450, 600)

    async function processPages(initialPageUrl, fileName, firstPage, lastPage) {
        if(firstPage !== 1)
            initialPageUrl = initialPageUrl + "?page=" + firstPage
        const browser = await puppeteer.launch({headless: true})
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);
        await page.goto(initialPageUrl)
        console.log("Start: " + new Date().toLocaleTimeString());
        const companiesPagesAmount = await getCompaniesPagesAmount(page)
        for (let i = firstPage; i <= lastPage; i++) {
            console.log("Current companies page: " + i)
            await goThroughCurrentCompaniesPage(i, page, fileName, lastPage)
            console.log("End: " + new Date().toLocaleTimeString());
        }
        await browser.close()
    }

    async function writeInCSVFile(content, fileName) {
        try {
            await fs.appendFile(fileName, content);
        } catch (err) {
            console.log(err);
        }
    }

    async function goThroughCurrentCompaniesPage(currentPageNum, page, fileName, lastPage) {
        const companiesPagesAmount = await getCompaniesPagesAmount(page)
        const links = await page.$x('//a[@data-link_text="Profile Button"]');
        let linkUrls = await page.evaluate((...links) => {
            return links.map(e => e.href);
        }, ...links);

        for(const link of linkUrls) {
            await page.goto(link)
            const reviewsPagesAmount = await getReviewsAmount(page)
            for (let i = 1; i <= reviewsPagesAmount; i++) {
                await goThroughCurrentCompanyPage(i, reviewsPagesAmount, page, fileName)
                await new Promise((resolve) => setTimeout(resolve, 1550));
            }
        }
        if (currentPageNum !== lastPage) {
            await page.goto("https://clutch.co/directory/mobile-application-developers?page=" + currentPageNum);
            page.click("#providers > nav > ul > li.page-item.next > a")
            await new Promise((resolve) => setTimeout(resolve, 1300));
        }
    }

    async function goThroughCurrentCompanyPage(currentPageNum, reviewsPagesAmount, page, fileName) {
        const reviews = (await page.$x('//div[@class="feedback client-interview"]'));
        for (let j = 1; j <= reviews.length; j++) {
            let dataToWrite = (
                await getName(reviews[j - 1], j, page) + ", " +
                await getTitle(reviews[j - 1], j, page) + ", " +
                await getCompanyName(reviews[j - 1], j, page) + ", " +
                await getGrade(reviews[j - 1], j, page) + ", " +
                await getEmployeesAmount(reviews[j - 1], j, page) + ", " +
                await getLocation(reviews[j - 1], j, page) + ", " +
                await getBudget(reviews[j - 1], j, page) + "\n"
            );
            writeInCSVFile(dataToWrite, fileName)
        }
        console.log("-------------------------")
        if(currentPageNum !== reviewsPagesAmount)
            page.click("#profile-feedback > div.text-center > ul > li.page-item.next > a")
    }

    async function getCompaniesPagesAmount(page) {
        let xpathExpression = '//*[@id=\"info-bar\"]/div';
        const companiesAmount = (await page.$x(xpathExpression));
        const companiesAmountParsed = await page.evaluate((...companiesAmount) => {
            return companiesAmount.map(e => e.innerText);
        }, ...companiesAmount);
        const resultNum = Number.parseInt(companiesAmountParsed[0].replace(/\D/g,''));
        return Math.ceil(resultNum / 40);
    }

    async function getReviewsAmount(page) {
        let xpathExpression = '//*[@id="summary_section"]/div[2]/div[1]/div[2]/div[1]/div/a[2]';
        const reviewAmounts = (await page.$x(xpathExpression));
        const reviewAmountsParsed = await page.evaluate((...reviewAmounts) => {
            return reviewAmounts.map(e => e.innerText);
        }, ...reviewAmounts);
        const resultNum = reviewAmountsParsed && reviewAmountsParsed[0]? Number.parseInt(reviewAmountsParsed[0].replace(/\D/g,'')): 0;
        return Math.ceil(resultNum / 10);
    }

    async function getBudget(review, elementPosition, page) {
        let xpathExpression = '(//div[@class="feedback client-interview"])[' + elementPosition + ']//div[@class="abs-aligned"]//div[@class="field field-name-cost field-inline custom_popover"]//div[@class="field-item"]';
        const budgets = (await review.$x(xpathExpression));
        const budgetsParsed = await page.evaluate((...budgets) => {
            return budgets.map(e => e.innerText);
        }, ...budgets);
        return budgetsParsed[0]
            .replaceAll(",", "")
    }

    async function getLocation(review, elementPosition, page) {
        let xpathExpression = '(//div[@class="feedback client-interview"])[' + elementPosition + ']//div[@class="field-name-location field-inline custom_popover"]//span';
        const locations = (await review.$x(xpathExpression));
        const locationsParsed = await page.evaluate((...locations) => {
            return locations.map(e => e.innerText);
        }, ...locations);
        return locationsParsed[0]? locationsParsed[0].replaceAll(",", ""): "-"
    }

    async function getEmployeesAmount(review, elementPosition, page) {
        let xpathExpression = '(//div[@class="feedback client-interview"])[' + elementPosition + ']//div[@class="field-name-company-size field-inline custom_popover"]';
        const employees = (await review.$x(xpathExpression));
        const employeesParsed = await page.evaluate((...employees) => {
            return employees.map(e => e.innerText);
        }, ...employees);
        return employeesParsed[0] !== undefined? employeesParsed[0].split(" ")[0]: "-"
    }

    async function getGrade(review, elementPosition, page) {
        let xpathExpression = '(//div[@class="feedback client-interview"])[' + elementPosition + ']//div[@class="review-mobile-stars-tp"]//div[@class="rating-reviews sg-rating"]//span[@class="rating sg-rating__number"]';
        const grades = (await review.$x(xpathExpression));
        const gradesParsed = await page.evaluate((...grades) => {
            return grades.map(e => e.innerText);
        }, ...grades);
        return gradesParsed[0].trim()
    }

    async function getCompanyName(review, elementPosition, page) {
        let xpathExpression = '(//div[@class="feedback client-interview"])[' + elementPosition + ']//div[@class="field-name-title"]';
        const companyNames = (await review.$x(xpathExpression));
        const companyNamesParsed = await page.evaluate((...companyNames) => {
            return companyNames.map(e => e.innerText);
        }, ...companyNames);
        const companyName = companyNamesParsed[1]
            .trim()
            .split(",")[1]
        return companyName? companyName: "-";
    }

    async function getTitle(review, elementPosition, page) {
        let xpathExpression = '(//div[@class="feedback client-interview"])[' + elementPosition + ']//div[@class="field-name-title"]';
        const titles = (await review.$x(xpathExpression));
        const titlesParsed = await page.evaluate((...titles) => {
            return titles.map(e => e.innerText);
        }, ...titles);
        return titlesParsed[0]
            .split(",")[0]
            .trim()
    }

    async function getName(review, elementPosition, page) {
        let xpathExpression = '(//div[@class="feedback client-interview"])[' + elementPosition + ']//div[@class="field-name-full-name-display"]//div[1]';
        let result = "";
        const names = (await review.$x(xpathExpression));
        const namesParsed = await page.evaluate((...names) => {
            return names.map(e => e.innerText);
        }, ...names);
        result = namesParsed.length !== 0? namesParsed[0]: "-";
        return result;
    }
}

start()