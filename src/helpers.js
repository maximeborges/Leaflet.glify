export const defaults = (userSettings, defaults) => {
    let settings = {};

    for (let key in defaults) {
        if (defaults.hasOwnProperty(key)) {
            settings[key] = (userSettings.hasOwnProperty(key) ? userSettings[key] : defaults[key]);
        }
    }

    return settings;
};

export const tryFunction = (it, lookup) => {
    //see if it is actually a function
    if (typeof it === 'function') {
        return it;
    }

    //we know that it isn't a function, but lookup[it] might be, check that here
    if (typeof lookup === 'undefined' || !lookup.hasOwnProperty(it)) {
        return null;
    }

    return lookup[it];
};
