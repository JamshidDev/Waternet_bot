const axios = require("axios");
const BASE_URL = "https://cadry.waternet.uz";


const login_user =async (payload) => {
    return await axios.post(`${BASE_URL}/api/auth/client/login`, payload.data).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}

const register_user =async (payload) => {
    return await axios.post(`${BASE_URL}/api/client/registration/${payload.client_id}`, payload.data).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}

const user_info =async (payload) => {
    return await axios.get(`${BASE_URL}/api/client/client-info`, {params:payload}).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}

const orders =async (payload) => {
    return await axios.get(`${BASE_URL}/api/client/orders`, {params:payload}).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}
const edit_orders =async (payload) => {
    return await axios.put(`${BASE_URL}/api/client/order/update`, payload.data).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}
const delete_orders =async (payload) => {
    return await axios.delete(`${BASE_URL}/api/client/order/delete`, {params:payload}).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}

const client_products =async (payload) => {
    return await axios.get(`${BASE_URL}/api/client/products`, {params:payload}).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}

const create_order =async (payload) => {
    return await axios.post(`${BASE_URL}/api/client/create/order`, payload.data).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}

const edit_rate =async (payload) => {
    return await axios.put(`${BASE_URL}/api/client/order-rates/${payload.client_id}/update`, payload.data).then((res) => {
        return [null, res.data]
    }).catch((error) => {
        return [error, null]
    })
}









module.exports =  { login_user, register_user, user_info, orders, edit_orders, delete_orders, client_products, create_order, edit_rate }