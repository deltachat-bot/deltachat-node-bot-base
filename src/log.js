const timestamp = () => {
	var now = new Date();
	return "[".concat(now.toLocaleString("en-US"), "]");
    };

const log = (...args) => {
  if (process.env.NODE_ENV != 'test') {
    console.log(timestamp(), ...args)
  }
}

module.exports = log
