import { CookieJar } from 'tough-cookie'
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
const HEADERS = {
    'Accept': '*/*',
    'Accept-Language': '*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': process.env.REFFER_URL,
    "Origin": process.env.REFFER_URL,
    // "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    // "sec-fetch-site": "same-site",
    // "accept": "application/json, text/plain, */*",
    // "accept-language": "en,vi-VN;q=0.9,vi;q=0.8",
    // "cache-control": "no-cache",
    // "pragma": "no-cache",
    // "priority": "u=1, i",
    // "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
    // "sec-ch-ua-mobile": "?0",
    // "sec-ch-ua-platform": "\"Windows\"",
    // "x-app-id": "carv",
}

const parseProxy = (proxy_url) => {
    if (!proxy_url) return false

    return new HttpsProxyAgent(proxy_url)
}

class Axios {
    constructor(proxy, ua, cookie = "") {
        this.proxy = proxy
        this.first_header = {}
        this.ua = ua || USER_AGENT
        const agent = parseProxy(proxy)
        this.axios = axios.create({
            timeout: 30000,
            httpAgent: agent,
            httpsAgent: agent,
            "User-Agent": ua || USER_AGENT
        });
        this.cookieJar = new CookieJar()
        this.frist_cookie = false
        // TO DO cookie
    }

    async _processCookies(response, url) {
        if (!response.headers["Set-Cookie"]) return
        if (response.headers["Set-Cookie"] instanceof Array) {
            response.headers["Set-Cookie"].map(
                async (cookieString) => await this.cookieJar.setCookie(cookieString, url)
            );
        } else {
            await this.cookieJar.setCookie(response.headers["Set-Cookie"], url);
        }
    }

    async _requestForward(args) {
        let { url, method, body = "", additionalHeaders = {} } = args

        let headers = {
            "Accept": "application/json",
            "Referer": process.env.REFFER_URL,
            "Origin": process.env.REFFER_URL,
        }
        headers.cookie = await this.cookieJar.getCookieString(url)
        headers = Object.assign({}, headers, additionalHeaders)
        let req_body = {
            url: url,
            method: method,
            headers: headers,
        }
        if (body) req_body.body = body
        if (this.proxy) req_body.proxy = this.proxy

        // if (!(body instanceof URLSearchParams) && !(body instanceof FormData)) {
        //     body = JSON.stringify(body)
        // }
        // if (body) body.body = body
        // if (this.proxy) body.proxy = this.proxy

        const response = await fetch(process.env.CF_REQUEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", },
            body: JSON.stringify(req_body),
        });

        const res_body = await response.json()

        await this._processCookies(response, url)
        return { body: res_body.content }
    }

    async _request(args) {
        try {
            let { url, method, body = "", additionalHeaders = {} } = args
            const cookie = await this.cookieJar.getCookieString(url)
            const more_headers = {
                "Cookie": cookie,
                "Host": (new URL(url)).host,
                'User-Agent': this.ua,
            }
            const headers = Object.assign({}, HEADERS, more_headers, additionalHeaders)
            const options = {
                url: url,
                headers: headers,
                method: method,
            }
            if (method != "get") options.data = body
            const response = await this.axios.request(options)
            await this._processCookies(response, url)
            return { status: response.status, body: response.data, headers: response.headers }
        } catch (error) {
            if (error.response) {
                return { status: error.response.status, body: error.response.data, headers: error.response.headers }
            }
            return { status: 500, body: error.message }
        }
    }

    async _getFirstCookie() {
        this.frist_cookie = true

        const more_headers = {
            // host: (new URL("https://interface.carv.io/banana/get_user_info")).host,
            'User-Agent': this.ua,
        }

        const response = await axios.request({
            url: process.env.CF_REQUEST_URL,
            method: "post",
            headers: {
                'Content-Type': "application/json",
            },
            data: {
                url: process.env.REFFER_URL,
                method: "GET",
                proxy: this.proxy,
                headers: Object.assign({}, HEADERS, more_headers)
            }
        })
        if (response.data.headers) {
            this.first_header = response.data.headers
            await this._processCookies(response.data, process.env.REFFER_URL)
        }
    }

    async request(args) {
        if (process.env.CF_REQUEST_TYPE == "2" && !this.frist_cookie) {
            await this._getFirstCookie()
        }
        if (process.env.CF_REQUEST_TYPE == "1") {
            return this._requestForward(args)
        }
        return this._request(args)
    }
}

export default Axios