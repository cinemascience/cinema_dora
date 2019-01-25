
/* 
 * Utility javascript functions that don't really belong anywhere else.
 */


//rounds to the next power of 2
function upPow2( aSize ){
    return Math.pow( 2, Math.ceil( Math.log( aSize ) / Math.log( 2 ) ) ); 
  }
  
  //ndArray(m,x,...,n) makes an nd array 
  // of m*x*...*n size (note fore empty arrays)
  //at the lowest level n should be 0 not 1.
  //i.e. ndArray(4,0) -> [[],[],[],[]]
  function ndArray(length) {
      var arr = new Array(length || 0),
          i = length;
  
      if (arguments.length > 1) {
          var args = Array.prototype.slice.call(arguments, 1);
          while(i--) arr[length-1 - i] = ndArray.apply(this, args);
      }
  
      return arr;
  }
  
  //python style range function
  function range(start, stop, step) {
      if (typeof stop == 'undefined') {
          // one param defined
          stop = start;
          start = 0;
      }
  
      if (typeof step == 'undefined') {
          step = 1;
      }
  
      if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
          return [];
      }
  
      var result = [];
      for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
          result.push(i);
      }
  
      return result;
  };
  
  //allows python style string formatting, i.e.:
  // "Hello {0}, how are {1}".format("World", "You") -> Hello Worlds, how are You
  // First, checks if it isn't implemented yet.
  if (!String.prototype.format) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
        ;
      });
    };
  }
  
  //given a list of lists, returns all permutations
  function cartesion(alist) {
      var r = [],
          arg = alist,
          max = arg.length-1;
      //recurcive helper function
      function helper(arr, i) {
          for(var j = 0, l = arg[i].length; j<l; j++){
              var a = arr.slice(0); //clone
              a.push(arg[i][j]);
              if(i==max)
                  r.push(a);
              else 
                  helper(a,i+1);
          }
      }
      helper([], 0);
      return r;
  } 
  
  
  //clamps a number between two values
  function clamp(val,min,max)
  {
      return Math.min(Math.max(val,min), max);
  }
  
  //tests if value is a number
  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
  
  //returns all the values that are every list for an array of lists
  //modified from http://stackoverflow.com/questions/11076067/finding-matches-between-multiple-javascript-arrays
  function intersect_lists(lists) {
      var output = [];
      var cntObj = {};
      var array, item, cnt;
      // for each array passed as an argument to the function
      for (var i = 0; i < lists.length; i++) {
          array = lists[i];
          // for each element in the array
          for (var j = 0; j < array.length; j++) {
              item = "-" + array[j]; //prepending this fixes a bug with builtin types for some browsers
              cnt = cntObj[item] || 0;
              // if cnt is exactly the number of previous arrays, 
              // then increment by one so we count only one per array
              if (cnt == i) {
                  cntObj[item] = cnt + 1;
              }
          }
      }
      // now collect all results that are in all arrays
      for (item in cntObj) {
          if (cntObj.hasOwnProperty(item) && cntObj[item] === lists.length) {
              output.push(item.substring(1));//remove the "-" from the beginning of an item we introduced earlier
          }
      }
      return(output);
  }
  
  
  function getmedian(num_array){
      num_array.sort( function(a,b) {return a - b;} );
  
      var half = Math.floor(num_array.length/2);
  
      if(num_array.length % 2)
          return num_array[half];
      else
          return (num_array[half-1] + num_array[half]) / 2.0;
  }
  
  function getmean(num_array){
      var sum = num_array.reduce(function(a, b) { return a + b; });
      var avg = sum / num_array.length;
      return avg;
  }