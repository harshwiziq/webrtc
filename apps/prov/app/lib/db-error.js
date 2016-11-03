var db_error = {};

db_error.get_detail = function (error) {
    var err = {};

    if (error && error.name && error.name === 'ValidationError') {
        err.message = 'Missing or bad parameters';
        err.code = 400;
        return err;
    }

    err.code = 500;
    err.message = error && error.message ? error.message : error;
    return err;
};

module.exports = db_error;
