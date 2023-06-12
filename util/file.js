//Old images still remains in folder if edited, or product is deleted
const fs = require('fs');

const deleteFile = (filePath) => {
    //deletes file and name connected to that name
    fs.unlink(filePath, (err) => {
        if (err) {
            throw (err);
        }
    });
}

exports.deleteFile = deleteFile;