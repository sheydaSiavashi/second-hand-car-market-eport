
async function main() {
    const startTime = Date.now();

    await enrichCarData();
    await analyzeData();

    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`اجرا در ${executionTime} ثانیه به پایان رسید.`);
}

main().catch(console.error);

const axios = require('axios');

async function getCarsData() {
    try {
        const response = await axios.get('https://lm-models.s3.ir-thr-at1.arvanstorage.ir/cars.json');
        return response.data;
    } catch (error) {
        console.error('Error fetching cars data:', error);
        return [];
    }
}

async function getMarketPriceData() {
    try {
        const response = await axios.get('https://lm-models.s3.ir-thr-at1.arvanstorage.ir/market_prices.json');
        return response.data;
    } catch (error) {
        console.error('Error fetching market price data:', error);
        return [];
    }
}

async function getCurrencyData() {
    try {
        const response = await axios.get('https://baha24.com/api/v1/price');
        return response.data;
    } catch (error) {
        console.error('Error fetching currency data:', error);
        return {};
    }
}
const fs = require('fs').promises;

async function enrichCarData() {
    const cars = await getCarsData();
    const marketPrices = await getMarketPriceData();
    const currencyData = await getCurrencyData();
    const exchangeRate = currencyData.USD ? currencyData.USD.buy : 1;

    const marketPriceMap = new Map();
    marketPrices.forEach(priceData => {
        marketPriceMap.set(`${priceData.brand} ${priceData.model} ${priceData.year}`, {
            average_price: priceData.average_price,
            average_mileage: priceData.average_mileage
        });
    });

    const enrichedCars = cars.map(car => {
        const marketInfo = marketPriceMap.get(`${car.brand} ${car.model} ${car.year}`) || {};
        
        const priceDiffFromAverage = (car.price - (marketInfo.average_price || 0));
        const mileageDiffFromAverage = (car.mileage - (marketInfo.average_mileage || 0));
        const priceInUSD = (car.price / exchangeRate).toFixed(2);

        return {
            ...car,
            price_diff_from_average: priceDiffFromAverage,
            mileage_diff_from_average: mileageDiffFromAverage,
            price_usd: priceInUSD
        };
    });

    await fs.writeFile('cars_data.json', JSON.stringify(enrichedCars, null, 2));
    return enrichedCars;
}
async function analyzeData() {
    const cars = JSON.parse(await fs.readFile('cars_data.json'));
    
//ًq1
    const brandModelCount = {};
    cars.forEach(car => {
        const key = `${car.brand} ${car.model}`;
        brandModelCount[key] = (brandModelCount[key] || 0) + 1;
    });
    const mostCommon = Object.entries(brandModelCount).reduce((max, entry) => entry[1] > max[1] ? entry : max);
    console.log(`رایج‌ترین خودرو: ${mostCommon[0]} با ${mostCommon[1]} بار`);

//q2
    const top3ExpensiveCars = cars.sort((a, b) => b.price - a.price).slice(0, 3);
    console.log("3 خودروی گران‌قیمت:");
    top3ExpensiveCars.forEach(car => console.log(`${car.brand} ${car.model}: ${car.price} IRR`));

//q3
    const priceInUSD = cars.map(car => parseFloat(car.price_usd));
    const maxPrice = Math.max(...priceInUSD);
    const minPrice = Math.min(...priceInUSD);
    console.log(`اختلاف قیمت به دلار: ${maxPrice - minPrice}`);

//q4
    const colorCount = {};
    cars.forEach(car => {
        colorCount[car.color] = (colorCount[car.color] || 0) + 1;
    });
    console.log("تعداد خودروها برای هر رنگ:", colorCount);

//q5
    const lowestPrices = {};
    cars.forEach(car => {
        const key = `${car.brand} ${car.model}`;
        if (!lowestPrices[key] || car.price < lowestPrices[key].price || car.mileage < lowestPrices[key].mileage) {
            lowestPrices[key] = car;
        }
    });
    console.log("خودروهای با کمترین قیمت و مسافت:");
    Object.values(lowestPrices).forEach(car => console.log(`${car.brand} ${car.model}: قیمت: ${car.price} IRR، مسافت: ${car.mileage} km`));

//q6
    const top5FairPrices = cars.sort((a, b) => Math.abs(a.price_diff_from_average) - Math.abs(b.price_diff_from_average)).slice(0, 5);
    console.log("5 خودروی با قیمت عادلانه:");
    top5FairPrices.forEach(car => console.log(`${car.brand} ${car.model}: اختلاف قیمت از میانگین: ${car.price_diff_from_average} IRR`));

//q7
    const top5FairMileage = cars.sort((a, b) => Math.abs(a.mileage_diff_from_average) - Math.abs(b.mileage_diff_from_average)).slice(0, 5);
    console.log("5 خودروی با مسافت عادلانه:");
    top5FairMileage.forEach(car => console.log(`${car.brand} ${car.model}: اختلاف مسافت از میانگین: ${car.mileage_diff_from_average} km`));
}

