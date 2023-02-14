const { zip,tar } = require('compressing');

/**
 * 
 * @func 压缩为zip
 * 
 * 
*/
const compress_zip = async (filePath,targetPath)=>{
    let success;
    try{
       await zip.compressDir(filePath,targetPath);
       success = true;
    }catch(err){
       success = false;
    }
    return success;
}

/**
 * 
 * @func 压缩为tar
 * 
 * 
*/
const compress_tar = async (filePath,targetPath)=>{
    let success;
    try{
       await tar.compressDir(filePath,targetPath);
       success = true;
    }catch(err){
       success = false;
    }
    return success;
}

module.exports = {
    compress_tar,compress_zip
}