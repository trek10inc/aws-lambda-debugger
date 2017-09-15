// source
const obj = {};
document.querySelectorAll('.env-var-list .key-value')
  .forEach(elem => {
    if (elem.querySelectorAll('input[placeholder="Key"]').item(0).value)
      obj[elem.querySelectorAll('input[placeholder="Key"]').item(0).value] = elem.querySelectorAll('input[placeholder="Value"]').item(0).value });
const win = window.open('', '_blank');
win.document.write(`Debugger URL: chrome-devtools://devtools/remote/serve_file/@60cd6e859b9f557d2312f5bf532f6aec5f284980/inspector.html?experiments=true&v8only=true&ws=${obj.DEBUGGER_BROKER_ADDRESS}:9229/${obj.DEBUGGER_FUNCTION_ID}`);

/* bookmarklet:
javascript:(function()%7Bconst obj %3D %7B%7D%3B document.querySelectorAll('.env-var-list .key-value').forEach(elem %3D> %7B if (elem.querySelectorAll('input%5Bplaceholder%3D"Key"%5D').item(0).value) obj%5Belem.querySelectorAll('input%5Bplaceholder%3D"Key"%5D').item(0).value%5D %3D elem.querySelectorAll('input%5Bplaceholder%3D"Value"%5D').item(0).value %7D)%3B const win %3D window.open(''%2C '_blank')%3B win.document.write(%60Debugger URL%3A chrome-devtools%3A%2F%2Fdevtools%2Fremote%2Fserve_file%2F%4060cd6e859b9f557d2312f5bf532f6aec5f284980%2Finspector.html%3Fexperiments%3Dtrue%26v8only%3Dtrue%26ws%3D%24%7Bobj.DEBUGGER_BROKER_ADDRESS%7D%3A9229%2F%24%7Bobj.DEBUGGER_FUNCTION_ID%7D%60)%7D)()
*/