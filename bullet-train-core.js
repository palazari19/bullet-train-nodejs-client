let fetch;
const BULLET_TRAIN_KEY = "BULLET_TRAIN_DB";

const BulletTrain = class {

    constructor(props) {
        fetch = props.fetch;

        this.checkFeatureEnabled = this.checkFeatureEnabled.bind(this);
        this.getFlags = this.getFlags.bind(this);
        this.getFlagsForUser = this.getFlagsForUser.bind(this);
        this.getUserIdentity = this.getUserIdentity.bind(this);
        this.getValue = this.getValue.bind(this);
        this.getValueFromFeatures = this.getValueFromFeatures.bind(this);
        this.hasFeature = this.hasFeature.bind(this);
        this.init = this.init.bind(this);

        this.getJSON = function (url, method, body) {
            const { environmentID } = this;
            const options = {
                method: method || 'GET',
                body,
                headers: {
                    'x-environment-key': environmentID
                }
            };
            if (method !== "GET") {
                options.headers['Content-Type'] = 'application/json; charset=utf-8';
            }
            return fetch(url, options)
                .then(res => res.json());
        };
    }

    getFlagsForUser (identity) {
        const { onError, api } = this;

        if (!identity) {
            onError && onError({message: 'getFlagsForUser() called without a user identity'});
            return Promise.reject('getFlagsForUser() called without a user identity');
        }

        const handleResponse = (res) => {
            // Handle server response
            let flags = {};
            res.flags.forEach(feature => {
                flags[feature.feature.name.toLowerCase().replace(/ /g, '_')] = {
                    enabled: feature.enabled,
                    value: feature.feature_state_value
                };
            });
            return flags;
        };

        return this.getJSON(api + 'identities/?identifier=' + identity)
            .then(res => {
                return handleResponse(res);
            }).catch(({ message }) => {
                onError && onError({ message });
                return Promise.reject(message);
            });
    }

    getUserIdentity (identity) {
        const { onError, api } = this;

        if (!identity) {
            onError && onError({message: 'getUserIdentity() called without a user identity'});
            return Promise.reject('getUserIdentity() called without a user identity');
        }

        const handleResponse = (res) => {
            // Handle server response
            let flags = {};
            let traits = {};
            res.flags.forEach(feature => {
                flags[feature.feature.name.toLowerCase().replace(/ /g, '_')] = {
                    enabled: feature.enabled,
                    value: feature.feature_state_value
                };
            });
            res.traits.forEach(({trait_key, trait_value}) => {
                traits[trait_key.toLowerCase().replace(/ /g, '_')] = trait_value;
            });
            return { flags, traits };
        };

        return this.getJSON(api + 'identities/?identifier=' + identity)
            .then(res => {
                return handleResponse(res);
            }).catch(({ message }) => {
                onError && onError({ message });
                return Promise.reject(message);
            });
    }

    getFlags() {
        const { onError, api } = this;

        const handleResponse = (res) => {
            // Handle server response
            let flags = {};
            res.forEach(feature => {
                flags[feature.feature.name.toLowerCase().replace(/ /g, '_')] = {
                    enabled: feature.enabled,
                    value: feature.feature_state_value
                };
            });
            return flags;
        };

        return this.getJSON(api + "flags/")
            .then(res => {
                return handleResponse(res);
            }).catch(({ message }) => {
                onError && onError({ message });
                return Promise.reject(message);
            });
    };

    init({
             environmentID,
             api,
             disableCache,
             onError,
         }) {

        this.environmentID = environmentID;

        this.api = api;
        this.disableCache = disableCache;
        this.onError = onError;

        if (!environmentID) {
            throw ('Please specify a environment id');
        }
        if (api === undefined) {
            this.api = config.api;
        }
    }

    getValue (key, userId) {
        if (userId) {
            return this.getFlagsForUser(userId).then((flags) => {
                return this.getValueFromFeatures(key, flags);
            })
        } else {
            return this.getFlags().then((flags) => {
                return this.getValueFromFeatures(key, flags);
            });
        }
    }

    hasFeature (key, userId) {
        if (userId) {
            return this.getFlagsForUser(userId).then((flags) => {
                return this.checkFeatureEnabled(key, flags);
            })
        } else {
            return this.getFlags().then((flags) => {
                return this.checkFeatureEnabled(key, flags);
            });
        }
    }

    getValueFromFeatures (key, flags) {
        if (!flags) {
            return null;
        }
        const flag = flags[key];
        let res = null;
        if (flag) {
            res = flag.value;
        }
        //todo record check for value

        return res;
    }

    checkFeatureEnabled (key, flags) {
        if (!flags) {
            return false;
        }
        const flag = flags[key];
        let res = false;
        if (flag && flag.enabled) {
            res = true;
        }

        return res;
    }

    getTrait (identity, key) {
        const { onError } = this;

        if (!identity || !key) {
            onError && onError({message: `getTrait() called without a ${!identity ? 'user identity' : 'trait key'}`});
            return Promise.reject(`getTrait() called without a ${!identity ? 'user identity' : 'trait key'}`);
        }

        return this.getUserIdentity(identity)
            .then(({traits}) => traits[key])
            .catch(({ message }) => {
                onError && onError({ message });
                return Promise.reject(message);
            });
    }

    setTrait (identity, key, value) {
        const { onError, api } = this;

        if (!identity || !key) {
            onError && onError({message: `setTrait() called without a ${!identity ? 'user identity' : 'trait key'}`});
            return Promise.reject(`setTrait() called without a ${!identity ? 'user identity' : 'trait key'}`);
        }

        const body = {
            "identity": {
                "identifier": identity
            },
            "trait_key": key,
            "trait_value": value
        }

        return this.getJSON(`${api}traits/`, 'POST', JSON.stringify(body))
            .then(() => this.getUserIdentity(identity))
            .catch(({ message }) => {
                onError && onError({ message });
                return Promise.reject(message);
            });
    }
};

module.exports = function ({ fetch }) {
    return new BulletTrain({ fetch });
};
