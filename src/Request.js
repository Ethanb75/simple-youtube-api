const fetch = require('cross-fetch');
const { stringify } = require('querystring');
const RequestError = require('./Error');
const Constants = require('./util/Constants');

class Request {
    constructor(youtube) {
        this.youtube = youtube;
    }

    /**
     * Make a request to the YouTube API
     * @param {string} endpoint The endpoint to query
     * @param {object} [qs={}] Query strings
     * @returns {Promise<object>}
     */
    make(endpoint, qs = {}) {
        endpoint = this._makeEndpoint(endpoint, qs);
        return fetch(endpoint).then(response => {
            return response.json().then(json => {
                if (response.ok) return json;
                return Promise.reject(new RequestError(endpoint, json.error));
            }, () => response.text().then(text => new RequestError(endpoint, text)));
        });
    }

    /**
     * Get a resource from the YouTube API
     * @param {string} type The type of resource to get
     * @param {object} [qs={}] Any other query options
     * @returns {Promise<object>}
     */
    getResource(type, qs = {}) {
        qs = Object.assign({ part: Constants.PARTS[type] }, qs);
        const endpoint = Constants.ENDPOINTS[type];

        return this.make(endpoint, qs).then(result => {
            if (result.items.length) return result.items[0];
            return Promise.reject(new RequestError(this._makeEndpoint(endpoint, qs), `resource ${result.kind} not found`));
        });
    }

    /**
     * Get a resource from the YouTube API, by ID
     * @param {string} type The type of resource to get
     * @param {string} id The ID of the resource to get
     * @param {object} [qs={}] Any other query options
     * @returns {Promise<object>}
     */
    getResourceByID(type, id, qs = {}) {
        return this.getResource(type, Object.assign(qs, { id }));
    }

    /**
     * Get a video from the YouTube API
     * @param {string} id The video to get
     * @param {object} [options] Any request options
     * @returns {Promise<object>}
     */
    getVideo(id, options) {
        return this.getResourceByID('Videos', id, options);
    }

    /**
     * Get a playlist from the YouTube API
     * @param {string} id The playlist to get
     * @param {object} [options] Any request options
     * @returns {Promise<object>}
     */
    getPlaylist(id, options) {
        return this.getResourceByID('Playlists', id, options);
    }

    /**
     * Get a channel from the YouTube API
     * @param {string} id The channel to get
     * @param {object} [options] Any request options
     * @returns {Promise<object>}
     */
    getChannel(id, options) {
        return this.getResourceByID('Channels', id, options);
    }

    /**
     * Fetch a paginated resource.
     * @param {string} endpoint The endpoint to query.
     * @param {number} [count=Infinity] How many results to retrieve.
     * @param {Object} [options={}] Additional options to send.
     * @param {Array} [fetched=[]] Previously fetched resources.
     * @param {?string} [pageToken] The page token to retrieve.
     * @returns {Promise<Array<object>>}
     */
    getPaginated(endpoint, count = Infinity, options = {}, fetched = [], pageToken = null) {
        if(count < 1) return Promise.reject('Cannot fetch less than 1.');

        const limit = count > 50 ? 50 : count;
        return this.make(endpoint, Object.assign(options, { pageToken, maxResults: limit })).then(result => {
            const results = fetched.concat(result.items);
            if(result.nextPageToken && limit !== count) return this.getPaginated(endpoint, count - limit, options, results, result.nextPageToken);
            return results;
        });
    }

    _makeEndpoint(endpoint, qs) {
        qs = stringify(Object.assign({ key: this.youtube.key }, qs));
        return `https://www.googleapis.com/youtube/v3/${endpoint}?${qs}`;
    }
}

module.exports = Request;
