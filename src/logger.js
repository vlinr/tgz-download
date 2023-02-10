/**
 *
 *@method 自定义日志管理类
 * @param {string} text:日志内容
 * @param {string} level:日志级别
 *
 * */

const { format } = require('./util')

const logger = (text, level = 1)=> {
  const date = format(new Date().getTime(), 'YYYY-MM-DD HH:mm:ss')
  switch (level) {
    case 1: //普通日志
      console.info(`[${date}] ${text}`)
      break
    case 2: //警告日志
      console.warn(`[${date}] ${text}`)
      break
    case 3:
      console.verbose(`[${date}] ${text}`)
      break
    case 4:
      console.debug(`[${date}] ${text}`)
      break
    case 5:
      console.silly(`[${date}] ${text}`)
      break
    case 6:
      console.error(`[${date}] ${text}`)
      break
  }
}

module.exports = logger
