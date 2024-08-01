export const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = (...args: Parameters<F>) => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
    return () => timeout ? clearTimeout(timeout) : void 0;
  };
  
  return debounced;
};


/**
 * Will only call the function once every `waitFor` milliseconds, if the function is called multiple times during
 * that time, it will only call the lastest function once at the end of the time.
 * for example with 100ms between each call:
 * 2 calls at same time: the first call will be executed, thent the second one 100ms later.
 * 3 calls at same time: the first call will be executed, then the second one will be ignored, and the third one will be executed 100ms later.
 * the first execution must be immediate.
 */
export const throttle = <F extends (...args: any[]) => any>(func: F, _waitFor: number | Promise<number>) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<F> | null = null;
  let resetExecutedTimeout: ReturnType<typeof setTimeout> | null = null;
  let executed: boolean = false;
  let waitFor = 0;
  let executing = false;
  (_waitFor instanceof Promise ? _waitFor : Promise.resolve(_waitFor)).then((v) => waitFor = v);

  function execResetTimeout(){
    if(resetExecutedTimeout) clearTimeout(resetExecutedTimeout);
    resetExecutedTimeout = setTimeout(() => {
      executed = false;
    }, waitFor);
  }

  const throttled = (...args: Parameters<F>) => {
    if(executing) return;
    if(executed) execResetTimeout()
    if (timeout) {
      lastArgs = args;
      return;
    } else {
      if(executed) {
        lastArgs = args;
        timeout = setTimeout(() => {
          if(lastArgs) func(...lastArgs);
          lastArgs = null;
          timeout = null;
        }, waitFor)
      } else {
        executed = true;
        execResetTimeout()
        executing = true;
        func(...args);
        executing = false;
      }
    }
  };

  return throttled;
}