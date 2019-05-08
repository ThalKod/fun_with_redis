const { clearHash } = require("../services/cache");

module.exports = async (req, res, next) => {
  await next(); // We let the nmidllewares hadle it first

  clearHash(req.user.id);
};
