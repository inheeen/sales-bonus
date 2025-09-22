/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { sale_price, quantity } = purchase ;
    const discount = 1 - ( purchase.discount / 100) ;
    const finalPrice = sale_price * quantity ;
    const revenue = sale_price * quantity * discount ;
    return revenue ;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const baseProfit = seller.profit || 1000 ;

    if ( index === 0 ) {
        return  baseProfit * 0.15;
    } else if ( index === 1 || index === 2 ) { 
        return  baseProfit * 0.10 ;
    } else if ( index === total - 1) {
        return 0.00 ;
    } else {
        return  baseProfit * 0.05 ; 
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data 
        || !Array.isArray(data.sellers) 
        || !Array.isArray(data.products) 
        || !Array.isArray(data.purchase_records) 
        || data.sellers.length === 0 
        || data.products.length === 0 
        || data.purchase_records.length === 0) 
        {
        throw new Error('Данные отстутсвуют')
        }

    console.log('Данные найдены');
    console.log(`Продавцов: ${data.sellers.length}`);
    console.log(`Товаров: ${data.products.length}`);
    console.log(`Записей покупок: ${data.purchase_records.length}`);

    if (typeof options !== "object" || options === null) {
        throw new Error('Опция не является объектом') ;
    }

    const { calculateRevenue, calculateBonus } = options ;

    if (typeof calculateRevenue !== "function" || typeof calculateBonus !== "function") {
        throw new Error('Переменные в опциях не являются функциями') ;
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellersIndex = data.sellers.reduce((result, seller) => ({
        ...result,                   
        [seller.id]: seller 
    }), {})

    const productIndex = data.products.reduce((result, _product) => ({
        ...result,
        [_product.sku]: _product
    }), {})

 data.purchase_records.forEach(record => {
    const seller = sellersIndex[record.seller_id];
    if (!seller) {
        console.warn(`Продавец ${record.seller_id} не найден.`);
        return;
    }
    
    const sellerStatsItem = sellerStats.find(s => s.id === record.seller_id);
    sellerStatsItem.sales_count += 1;

    record.items.forEach(item => {
        const product = productIndex[item.sku];
        if (!product) {
            console.warn(`Товар ${item.sku} не найден.`);
            return;
        }

        const revenue = calculateRevenue(item, product); 
        const cost = product.purchase_price * item.quantity;
        const profit = revenue - cost;

        // Округляем каждое слагаемое перед сложением
        sellerStatsItem.revenue = Number((sellerStatsItem.revenue + revenue).toFixed(2));
        sellerStatsItem.profit = Number((sellerStatsItem.profit + profit).toFixed(2));

        if (!sellerStatsItem.products_sold[item.sku]) {
            sellerStatsItem.products_sold[item.sku] = 0;
        }
        sellerStatsItem.products_sold[item.sku] += item.quantity;
    });
});

    sellerStats.sort(( a, b ) => b.profit - a.profit)

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = Object.entries( seller.products_sold ).map(([sku, quantity]) => ({sku, quantity})).sort((a,b) => b.quantity - a.quantity).slice( 0, 10 )
    })

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: Number((Math.round(seller.revenue * 100) / 100).toFixed(2)),
        profit: Number((Math.round(seller.profit * 100) / 100).toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: Number((Math.round(seller.bonus * 100) / 100).toFixed(2))
    }));
}
