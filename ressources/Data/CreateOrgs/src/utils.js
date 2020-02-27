module.exports = {
  setAppropriateEnv: function (url, env = '') {
    if (env.toLowerCase() == 'prod' || env.toLowerCase() == 'production') {
      env = '';
    }
    if (env.toLowerCase() == 'staging' || env.toLowerCase() == 'uat') {
      env = 'qa';
    }
    if (env.toLowerCase() == 'development') {
      env = 'dev';
    }
    
    let isRecognizedEnv = env == '' || env.toLowerCase() == 'qa' || env.toLowerCase() == 'dev' || env.toLowerCase() == 'hipaa';
    
    if (!isRecognizedEnv) {
      console.warn("The environment you are trying to connect to is not recognized. Your call may fail due to a wrong endpoint.\nRecognized environments are 'production', 'hipaa', 'qa', and 'dev'.")
    }
    
    if (env == '') {
      return url;
    }

    return url.split('.', 1) + env + url.substring(url.indexOf('.'));
  },
  htmlize: function (str) {
    return str.normalize('NFKD').replace(/[^\w]/g, '');
  },
  addZeroWhenTooSmall: function (num, lgth = 2) {
    if (num.toString().length < lgth) {
      zerosToAdd = lgth - num.toString().length;
      for (i = 0; i < zerosToAdd; i++) {
        num = "0" + num;
      }
    }
    return num;
  }
}