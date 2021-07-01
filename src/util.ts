import * as fs from 'fs'

const writeToFile = (path, data) => new Promise<void | string>((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
        if(err) {
          reject(err.message)
        } else {
          console.debug(`\n File written to ${path}`)
          resolve()
        }
      })
})

export { writeToFile }