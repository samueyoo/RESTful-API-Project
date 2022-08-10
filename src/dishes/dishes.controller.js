const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));
//const dishes = require('../data/dishes-data')

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /dishes handlers needed to make the tests pass

function propertyValidation(propertyName) { //Validates various properties requests could contain
    //console.log('Validating for property:', propertyName)
    function nonPriceProperties (req, res, next) {
        const dishRequest = req.body.data;
        if (dishRequest[propertyName]) {
            //console.log('Validation is truthy, property:', propertyName)
            return next();
        }
        //console.log('Validation shows missing property:', propertyName)
        return next({
            status: 400,
            message: `Dish must include a ${propertyName}`
        })
    }
    function price (req, res, next) {
        const dishRequest = req.body.data;
        //console.log('Validation checking price:', dishRequest.price)
        if (!dishRequest.price && dishRequest.price !== 0) {
            //console.log('price is falsy')
            return next({
                status: 400,
                message: 'Dish must include a price'
            })
        } else if (dishRequest.price <= 0 || !Number.isInteger(dishRequest.price)) {
            //console.log('price is <= 0')
            return next({
                status: 400,
                message: 'Dish must have a price that is an integer greater than 0'
            })
        }
        return next();
    }

    if (propertyName === 'price') {
        return price;
    } else {
        return nonPriceProperties;
    }
}

function dishIdExists(req, res, next) { //Checks if the order exists per requested ID
    const dishId = req.params.dishId;
    const foundDish = dishes.find(dish => dish.id === dishId);
    if (foundDish) {
        res.locals.dish = foundDish;
        return next();
    }
    return next({
        status: 404,
        message: `No dish with ID ${dishId} found`
    })
}

function list(req, res) {
    res.send({ data: dishes });
}

function create(req, res) {
    const { data: { name, description, price, image_url } } = req.body;
    const newDish = {
        id: nextId(),
        name: name,
        description: description,
        price: price,
        image_url: image_url
    }
    console.log('Creating newDish:', newDish);
    dishes.push(newDish);
    res.status(201).json({ data: newDish });
}

function read(req, res) {
    const foundDish = res.locals.dish;
    res.json({ data: foundDish });
}

function update(req, res, next) {
    const foundDish = res.locals.dish;
    const { id = "", name = foundDish.name, description = foundDish.description, price = foundDish.price, image_url = foundDish.image_url } = req.body.data;
    if (id && id !== foundDish.id) {
        return next({
            status: 400,
            message: `Dish id does not match route id. Dish: ${foundDish.id}, Route: ${id}`
        })
    }
    foundDish.name = name;
    foundDish.description = description;
    foundDish.price = price;
    foundDish.image_url = image_url;
    //console.log('Confirming shallow copy changes:', dishes.find(dish => dish.id === id)) //Confirming shallow copy changes
    res.json({ data: foundDish })
}

module.exports = {
    list,
    create: [
        propertyValidation('name'),
        propertyValidation('description'),
        propertyValidation('price'),
        propertyValidation('image_url'),
        create
    ],
    read: [dishIdExists, read],
    update: [
        dishIdExists, 
        propertyValidation('name'),
        propertyValidation('description'),
        propertyValidation('price'),
        propertyValidation('image_url'),
        update
    ],
}