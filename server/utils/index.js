const fs = require('fs')
const path = require('path')

/**
 *
 * @method 路径是否存在,不存在则创建
 * @param dir{string} 需要检测的目录
 * */

const dirExists = async (dir)=> {
  const isExists = await getStat(dir)
  if (isExists && isExists.isDirectory()) {
    return true
  } else if (isExists) {
    return false
  }
  const tempDir = path.parse(dir).dir
  const status = await dirExists(tempDir)
  let mkdirStatus
  if (status) {
    mkdirStatus = await mkdir(dir)
  }
  return mkdirStatus
}

/**
 * @method 读取路径信息
 * @param {string} filepath 路径
 */
const getStat = (filePath)=> {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        resolve(false)
      } else {
        resolve(stats)
      }
    })
  })
}

/**
 *
 * @method 创建uuid
 * @returns string
 */

const createUUID = () => {
    const s = []
    const hexDigits = '0123456789abcdef'
    for (let i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
    }
    s[14] = '4' // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((Number(s[19]) & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = '-'
    return s.join('')
}
  
/**
 * @func 创建路径
 * @param {string} dir 路径
 */
const mkdir = (dir)=> {
    return new Promise((resolve, reject) => {
      fs.mkdir(dir, (dir, err) => {
        if (err) {
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }


  /**
 * 
 * @func 删除目录
 * 
 * @params filePath:{string} 目录
 * @params exclude:[string[]] 排除的内容
 * 
 * */ 
const rmDir = (filePath,exclude = [])=>{
    if (fs.existsSync(filePath)) {
      let files = fs.readdirSync(filePath);
      files.forEach((file) => {
        if(!exclude.includes(file)){
          const nextFilePath = `${filePath}/${file}`
          const states = fs.statSync(nextFilePath)
          if (states.isDirectory()) {
            rmDir(nextFilePath);
          } else {
            fs.unlinkSync(nextFilePath);
          }
        }
      })
      files = fs.readdirSync(filePath);
      if(files.length === 0)fs.rmdirSync(filePath);
    }
  }
  
  /**
   *
   * @method 读取数据
   * @param filePath{string}:读取的路径
   * @param fileName?{文件名称}:文件名称
   * @param json{boolean}：返回是否是json
   *
   * */
  
  const readFile = (filePath, fileName = '', json = true) =>{
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(filePath, fileName), 'utf8', (err, data) => {
        if (err) {
          reject({
            status: 0,
            msg: err,
          })
        } else {
          resolve({
            msg: json ? parseJSON(data) : data,
            status: 1,
          })
        }
      })
    })
  }

/**
 *
 * @method 格式化json
 *
 */
const parseJSON = (data) => {
    try {
      return JSON.parse(data)
    } catch (e) {
      logger('JSON format error,Please note whether the content to be obtained is correct.',6)
    }
  }

module.exports = {
    createUUID,
    dirExists,
    rmDir,
    readFile,
    getStat
}