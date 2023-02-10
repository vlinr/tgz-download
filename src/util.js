
/**
 *
 * @method 格式化日期
 * @param time:{string | number}:需要转化的日期，可以是一个日期也可以是一个时间戳也可以是秒，但是如果是日期，则以字符串传入，并且会 默认把字符串当成日期格式，如果是数字会当成时间戳或者秒
 * @param format:{string}:需要转化的格式：YYYYMMDD HHmmss w  年月日 时分秒 周  ===>除了MM 和 mm区分大小写，其余的均不区分大小写 周默认会转为 大写
 * @param seconds:{boolean}:是否使用秒
 * @param hideZero:{boolean}：是否隐藏自动补0
 * @returns string
 */

const format = (time, format, seconds = false, hideZero = false) => {
  if (/(M+)/.test(format)) {
    format = replaceStringByKey(format, 'M', 'f')
  }
  format = format.toLocaleLowerCase()
  const RULES = getRules(time, seconds)
  for (const key in RULES) {
    while (RegExp(`(${key})`).test(format)) {
      const str = RULES[key].toString()
      if (key === 'w+') {
        const WEEKS = ['日', '一', '二', '三', '四', '五', '六']
        format = format.replace(RegExp.$1, WEEKS[+str])
      } else {
        format = format.replace(
          RegExp.$1,
          str.length >= 2 || hideZero ? str : fillZero(str),
        )
      }
    }
  }
  return format
}

/**
 *
 * @method 获取转换规则
 * @param seconds:{boolean}:是否使用秒
 * */
const getRules = (time, seconds) => {
  if (seconds) {
    return {
      'd+': formatDateBySeconds(time, 'd'), // 日
      'h+': formatDateBySeconds(time, 'h'), // 时
      'm+': formatDateBySeconds(time, 'm'), // 分
      's+': formatDateBySeconds(time, 's'), // 秒
    }
  } else {
    const date = getDate(time)
    return {
      'y+': date.getFullYear(), // 年
      'f+': date.getMonth() + 1, // 月
      'd+': date.getDate(), // 日
      'h+': date.getHours(), // 时
      'm+': date.getMinutes(), // 分
      's+': date.getSeconds(), // 秒
      'w+': date.getDay(), // 星期
    }
  }
}

/**
 *
 * @method 传入的是秒，则普通解析
 *
 * @param time:{number|string}:秒
 *
 * */
const formatDateBySeconds = (time, key) => {
  let result = 0
  switch (key) {
    case 'h':
      result = Math.floor((+time / 3600) % 24)
      break
    case 'm':
      result = Math.floor((+time / 60) % 60)
      break
    case 's':
      result = Math.floor(+time % 60)
      break
    case 'd':
      result = Math.floor(+time / 3600 / 24)
      break
  }
  return result
}

/**
 *
 * @method 替换掉M
 *
 * */
const replaceStringByKey = (str, key, replace) => {
  let result = ''
  for (let i = 0; i < str.length; ++i) {
    const item = str[i]
    if (item === key) {
      result += replace
      continue
    }
    result += item
  }
  return result
}

/**
 *
 * @method 补0
 *
 * */
const fillZero = (num) => {
  return `0${num}`
}

/**
 *
 * @method 获取时间对象
 * @param time:{number|string}:时间
 * @param seconds:{boolean}:是否是秒
 *
 * @returns Date
 *
 * */
const getDate = (time) => {
  if (typeof time === 'number') return new Date(time)
  return new Date(time.toString().replace(/-/g, '/'))
}

/**
 *
 * @method 格式化json
 *
 */
const parseJSON = (data) => {
  try {
    return JSON.parse(data);
  } catch (e) {
    return data;
  }
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

module.exports = {
  format,
  parseJSON,
  createUUID,
}
