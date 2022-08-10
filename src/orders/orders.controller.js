const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

function propertyValidation(propertyName) {//Validates various properties requests could contain
    function checkMissingOrEmpty(req, res, next) {
        const orderRequest = req.body.data;
        if (orderRequest[propertyName]) {
            //res.locals.order = orderRequest;
            return next();
        }
        return next({
            status: 400,
            message: `Order must include a ${propertyName}`
        })
    }
    function checkDishes(req, res, next) {
        const orderRequest = req.body.data;
        if (!Array.isArray(orderRequest.dishes)) { //Should convert this to a switch statement instead later
            return next({
                status: 400,
                message: 'Order must include at least one dish'
            })
        } else if (Array.isArray(orderRequest.dishes) && orderRequest.dishes.length === 0) {
            return next({
                status: 400,
                message: 'Order must include at least one dish'
            })
        } else if (!orderRequest.dishes) {
            return next({
                status: 400,
                message: 'dishes property is missing'
            })
        }
        const index = orderRequest.dishes.findIndex(dish => !dish.quantity || dish.quantity <= 0 || !Number.isInteger(dish.quantity))
        //Above checks if any of the dish quantity validation fail conditions are met
        //console.log('index:', index)
        if (index >= 0) {
            return next({
                status: 400,
                message: `Dish ${index} must have a quantity that is an integer greater than 0`
            });
        }
        //console.log('Validation cleared for dish qty')
        return next();
    }
    if (propertyName === 'dishes') return checkDishes;
    return checkMissingOrEmpty;
}

function orderIdExists(req, res, next) { //Checks if the order exists per requested ID
    const orderId = req.params.orderId;
    const foundOrder = orders.find(order => order.id === orderId);
    if (foundOrder) {
        res.locals.order = foundOrder;
        return next()
    }
    return next({
        status: 404,
        message: `No dish with ID ${orderId} found`
    })
}

function list(req, res) {
    res.send({ data: orders })
}

function read(req, res) {
    const foundOrder = res.locals.order;
    res.json({ data: foundOrder });
}

function create(req, res) {
    const { data: { deliverTo, mobileNumber, status = "", dishes } } = req.body;
    const newOrder = {
        id: nextId(),
        deliverTo: deliverTo,
        mobileNumber: mobileNumber,
        status: status,
        dishes: dishes,
    }
    console.log('Creating newOrder:', newOrder)
    orders.push(newOrder);
    res.status(201).json({ data: newOrder });
}

function validateStatusAndId(req, res, next) { //Validates specifically the id and status properties separately
    const foundOrder = res.locals.order;

    if (req.method === 'DELETE') { //If this validation is being used for a DELETE request, validate just the pending status
        if (foundOrder.status !== 'pending') {
            return next({
                status: 400,
                message: 'An order cannot be deleted unless it is pending'
            })
        }
        return next();
    }

    const { id = "", status = "" } = req.body.data;

    if (id && id !== foundOrder.id) {
        return next({
            status: 400,
            message: `Order id does not match route id. Order: ${foundOrder.id}, Route: ${id}`
        })
    }
    if (foundOrder.status === 'delivered') {
        return next({
            status: 400,
            message: 'A delivered order cannot be changed'
            });
    }
    if (status === 'out-for-delivery' || status === 'pending' || status === 'preparing') {
        next();
    }
    return next({
        status: 400,
        message: 'Order must have a status of pending, preparing, out-for-delivery, delivered'
        });
}

function update(req, res) {
    const foundOrder = res.locals.order;
    const { id = "", deliverTo, mobileNumber, status, dishes } = req.body.data;

    foundOrder.deliverTo = deliverTo;
    foundOrder.mobileNumber = mobileNumber;
    foundOrder.status = status;
    foundOrder.dishes = dishes;

    //console.log('Confirming shallow copy changes:', orders.find(order => order.id === id)) //Confirming shallow copy changes
    res.json({ data: foundOrder })
}

function destroy(req, res) {
    const foundOrder = res.locals.order;
    const deletionIndexTarget = orders.findIndex(order => order.id === foundOrder.id);
    const deletedOrder = orders.splice(deletionIndexTarget, 1);
    res.sendStatus(204);
}

module.exports = {
    list,
    read: [orderIdExists, read],
    create: [
        propertyValidation('deliverTo'),
        propertyValidation('mobileNumber'),
        propertyValidation('dishes'),
        create
    ],
    update: [
        orderIdExists,
        propertyValidation('deliverTo'),
        propertyValidation('mobileNumber'),
        propertyValidation('dishes'),
        validateStatusAndId,
        update
    ],
    delete: [
        orderIdExists,
        validateStatusAndId,
        destroy
    ]
}