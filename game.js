//      game.js - same game HTML5 canvas implementation
//      Copyright (C) 2010 Renaudeau Gaetan <contact@grenlibre.fr>
//      
//      This program is free software; you can redistribute it and/or modify
//      it under the terms of the GNU General Public License as published by
//      the Free Software Foundation; either version 2 of the License, or
//      (at your option) any later version.
//      
//      This program is distributed in the hope that it will be useful,
//      but WITHOUT ANY WARRANTY; without even the implied warranty of
//      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//      GNU General Public License for more details.
//      
//      You should have received a copy of the GNU General Public License
//      along with this program; if not, write to the Free Software
//      Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
//      MA 02110-1301, USA.

/**
 * ChangeLog
 * 06 march 2010 - error managment + improve layout
 * 24 fev 2010 - Bugfixes
 * 21 fev 2010 - Initial release
 */

(function(){
  var game = window.game = {};
  
  var popupClosed = false;
  var hidePopup = function() {
    popupClosed = true;
    $('#popup').removeClass('active');
  }
  var showPopup = function() {
    if(popupClosed) return;
    $('#popup').addClass('active');
  }
  $('#popup .close').live('click', hidePopup);
  
/// game.Grid ///
  
  /**
   * Manage the game grid
   */
  game.Grid = function() {
    var size = null; // game grid size (record when grid generate)
    var columns; // Contains the grid
    
    // Utils
    var exists = function(x,y) {
      var column = columns[x];
      if(column==null) return false;
      var value = column[y];
      if(value==null) return false;
      return true;
    };
    var checkValue = function(x,y,num) {
      return exists(x,y) && columns[x][y] == num;
    };
    
    /**
     * Check if a brick is destroyable
     * @arg x y : position
     * @return [boolean]
     */
    var isDestroyable = function(x,y) {
      var num = columns[x][y];
      return checkValue(x,y-1,num) || checkValue(x,y+1,num) 
          || checkValue(x+1,y,num) || checkValue(x-1,y,num);
    };
    
    /**
     * Remove null values in an array
     * @arg array : the array to clean
     * @return : a cleaned array
     */
    var arrayClean = function(array) {
      var clean = [];
      for(var i in array)
        if(array[i]!=null)
          clean.push(array[i]);
      return clean;
    };
    
    return {
      
      // Public functions
      /**
       * Generate the grid with random colors
       * @arg width : x size of the grid
       * @arg height : y size of the grid
       * @arg nbColors : nb of color (random between 0 and nbColors-1)
       */
      generate: function(width, height, nbColors) {
        size = {x:width, y:height};
        columns = [];
        for(var x=0; x<size.x; ++x) {
          columns[x] = [];
          var column = columns[x];
          for(var y=0; y<size.y; ++y)
            column[y] = Math.floor(nbColors*Math.random());
        }
        return columns;
      },
      
      /**
       * Check if there are still bricks to destroy
       * @return [boolean]
       */
      noMoreDestroyable: function() {
        for(var x in columns)
          for(var y in columns[x])
            if(isDestroyable(x, y))
              return false;
        return true;
      },
      
      /**
       * Check if a brick is destroyable
       * @arg x y : position
       * @return [boolean]
       */
      isDestroyable: function(x,y) {
        return exists(x,y) && isDestroyable(x,y);
      },
      
      /**
       * Compute the gravity
       * @return a computed gravity object for animation
       */
      computeGravity: function() {
        
        var moveMap = {
          horizontal:[], // array of [int] (column move)
          vertical:[] // array of { y:[int], dy:[int] }
        };
        
        for(var x=0; x<columns.length; ++x) {
          moveMap.vertical[x] = [];
          moveMap.horizontal[x] = 0;
        }
        
        for(var x=0; x<columns.length; ++x) {
          var column = columns[x];
          var empty = true;
          for(var i=0; i<column.length && empty; ++i)
            if(column[i]!=null)
              empty = false;
          if(empty) {
            // No brick on this column. all right column will move
            var c = x+1;
            while(c<columns.length) {
              if(c>x)
                --moveMap.horizontal[c];
              ++c;
            }
          }  else {
            // Compute this column gravity.
            var wsCount=0; // white space count
            for(var y=0; y<size.y; ++y) {
              if(!exists(x,y))
                ++wsCount;
              else if(wsCount)
                moveMap.vertical[x].push({y:y, dy:wsCount});
            }
          }
        }
        
        return moveMap;
      },
      
      /**
       * Compute brick destroy propagation
       * @return : list of points concerned by the propagation ( array of position {x, y} )
       */
      computeDestroy: function(x,y) {
        if(!exists(x,y) || !isDestroyable(x,y))
            return [];
        
        var computed = [];
        var recCompute = function(x, y, numFilter) {
          if(!exists(x,y) || columns[x][y]!=numFilter)
            return; // Brick not found or not the same color
          
          for(var i=0; i<computed.length; ++i)
            if(computed[i].x==x && computed[i].y==y)
              return; // already in computed list
          
          computed.push({x:x, y:y});
          recCompute(x,y-1,numFilter);
          recCompute(x,y+1,numFilter);
          recCompute(x-1,y,numFilter);
          recCompute(x+1,y,numFilter);
        };
        
        recCompute(x,y,columns[x][y]);
        return computed;
      },
      
      /**
       * Apply a destroy to the grid
       * destroy : list of points ( array of position {x, y} )
       */
      applyDestroy: function(destroy) {
        for(var d in destroy)
          columns[destroy[d].x][destroy[d].y] = null;
      },
      
      /**
       * update the grid with a gravity vertical clean
       */
      applyMoveVertical: function() {
        for(var x in columns)
          columns[x] = arrayClean(columns[x]);
      },
      
      /**
       * update the grid with a gravity horizontal clean
       */
      applyMoveHorizontal: function() {
        for(var x in columns)
          if(columns[x].length==0)
            columns[x] = null;
        columns = arrayClean(columns);
      },
      
      /**
       * get the grid
       * @return : columns (array of array of brick)
       */
      getColumns: function() {
        return columns;
      },
      
      /**
       * get a column by id
       * @arg i : column abscissa x
       * @return : column (array of brick)
       */
      getColumn: function(i) {
        return columns[i] || [];
      },
      
      /**
       * get brick value by his position
       * @arg x y : brick position
       * @return : brick value
       */
      getValue: function(x,y) {
        return columns[x]!=null ? columns[x][y] : null;
      }
    }
  }();
  
  
/// game.CanvasBack ///
  
  /**
   * Manage the background canvas 
   * for mouse hover effects
   */
  game.CanvasBack = function() {
    var canvas;
    var ctx;
    
    return {
      init: function() {
        canvas = $('#sameGameBack')[0];
        ctx = canvas.getContext('2d');
      },
      
      /**
       * Clear the canvas
       */
      clean: function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
      
      /**
       * Update the canvas size with the main canvas size.
       */
      updateSize: function() {
        var sg = $('#sameGame');
        $('#sameGameBack').css({
          left: sg.offset().left,
          top: sg.offset().top
        });
        canvas.width = sg.width();
        canvas.height = sg.height();
      },
      
      /**
       * fill white circles around bricks
       * @arg points : List of point ( array of position {x, y} )
       */
      drawHover: function(points) {
        var bs = game.Canvas.getBrickSize();
        var gridSize = game.Canvas.getGridSize();
        ctx.fillStyle = "#fff";
        ctx.save();
        ctx.scale(bs.w, bs.h);
        for(var p in points) {
          ctx.beginPath();
          ctx.arc(.5+points[p].x, .5+gridSize.h-1-points[p].y, .49, 0, Math.PI*2, true);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }();
  $(document).ready(game.CanvasBack.init);
  
  
/// game.Canvas ///
  
  /**
   * Manage the main canvas
   */
  game.Canvas = function() {
    var canvas;
    var ctx;
    
    // Game size
    var gridSize = {w:0, h:0}; 
    var canvasSize = {w:0, h:0};
    var brickSize = {w:0, h:0};
    
    // Game number of color
    var nbColor; 
    
    // Color number correspondance
    var colors = ['#D34040', '#82D340', '#40C2D3', '#8B40D3', '#D3C840'];
    
    // true for activate animation
    var animation = true;
    
    // Hover managment
    var destroyHoverOn;
    var g_hoverDestroyed = null;
    var g_oldBrickHover;
    
    /**
     * Transform a brick position to a canvas position
     * @arg x y : brick position
     */
    var brickPosition2canvasPosition = function(x, y) {
      return { x: x*brickSize.w, y: (gridSize.h-y-1)*brickSize.h };
    };
    
    /**
     * Change the cursor 
     * @arg isPointer : if true set to pointer, else set to default
     */
    var setCursor = function(isPointer) {
      $(canvas).css('cursor', isPointer?'pointer':'default');
    };
    
    /**
     * Activate or desactivate the destroyable bricks hover
     * @arg isOn : true to active, false to disable
     */
    var setDestroyHover = function(isOn) {
      if(!isOn) onMouseOut();
      destroyHoverOn = !isOn ? false : true;
    };
    
    // ANIMATE
    
    /**
     * Animate the gravity
     * @arg move : the computed animate move
     * @arg callback : function called when animation is done
     */
    var animateGravity = function(move, callback) {
      if(!animation) {
        game.Grid.applyMoveVertical();
        game.Grid.applyMoveHorizontal();
        callback();
        return;
      }
      var beginTime;
      
      var animateTimeY = 200; // Y axis time
      var animateTimeX = 150; // X axis time
      var lastCycleBrickPositions = []; // record old position for cleanRect
      
      var vertMoveApplied = false;
      var i = 0;
      
      var cycle = function() {
        var currentTime = new Date();
        if((currentTime-beginTime)>(animateTimeY+animateTimeX)) {
          game.Grid.applyMoveHorizontal();
          callback(move);
        }
        else {
          setTimeout(cycle, 30);
        
          for(var b in lastCycleBrickPositions) {
            var bp = lastCycleBrickPositions[b];
            ctx.clearRect(bp.x, bp.y, brickSize.w, brickSize.h);
          }
          lastCycleBrickPositions = [];
          
          var currentProgressX, currentProgressY;
          
          if( (currentTime-beginTime)<animateTimeY ) {
            currentProgressX = 0;
            currentProgressY = i==0 ? 0 : (currentTime-beginTime)/animateTimeY;
            for(var x in move.vertical) {
              var col = move.vertical[x];
              for(var c in col) {
                var color = game.Grid.getValue(x,col[c].y);
                if(color!=null) {
                  ctx.fillStyle = colors[color];
                  var y = col[c].y - col[c].dy*currentProgressY;
                  var bp = brickPosition2canvasPosition(x, y);
                  lastCycleBrickPositions.push(bp);
                  drawBrick(bp.x, bp.y);
                }
              }
            }
          }
          else {
            if(!vertMoveApplied) {
              vertMoveApplied = true;
              i = 0;
              lastCycleBrickPositions = [];
              game.Grid.applyMoveVertical();
              
              for(var x in move.vertical) {
                var col = move.vertical[x];
                for(var c in col) {
                  var y = col[c].y-col[c].dy;
                  var color = game.Grid.getValue(x,y);
                  if(color!=null) {
                    ctx.fillStyle = colors[color];
                    var bp = brickPosition2canvasPosition(x, y);
                    drawBrick(bp.x, bp.y);
                  }
                }
              }
            }
            
            currentProgressX = i==0 ? 0 : (currentTime-beginTime-animateTimeY)/animateTimeX;
            currentProgressY = 1;
            for(var c=0; c<move.horizontal.length; ++c) {
              var col = move.horizontal[c];
              if(col) {
                var column = game.Grid.getColumn(c);
                var x = c + col*currentProgressX;
                for(var y=0; y<column.length; ++y) {
                  var value = column[y];
                  ctx.fillStyle = colors[value];
                  var bp = brickPosition2canvasPosition(x, y);
                  lastCycleBrickPositions.push(bp);
                  drawBrick(bp.x, bp.y);
                }
              }
            }
          }
        }
        ++i;
      }
      beginTime = new Date().getTime();
      cycle();
    };
    
    /**
     * Animate destroyed brick
     * @arg destroyed : list of position {x, y} to destroy
     * @arg callback : function called when animation is done
     */
    var animateDestroyed = function(destroyed, callback) {
      if(!animation) return callback(destroyed);
      var beginTime = new Date().getTime();
      var animateTime = 100;
      var lastProgress = 0;
      var cycle = function() {
        var currentTime = new Date().getTime();
        if( (currentTime-beginTime) > animateTime ) {
          ctx.globalAlpha = 1;
          callback(destroyed);
        }
        else {
          setTimeout(cycle, 30);
          ctx.fillStyle = $('body').css('background-color');
          var currentProgress = (currentTime-beginTime)/animateTime;
          ctx.globalAlpha = currentProgress - lastProgress;
          for(var i in destroyed) {
            var bp = brickPosition2canvasPosition(destroyed[i].x, destroyed[i].y);
            ctx.fillRect(bp.x, bp.y, brickSize.w, brickSize.h);
          }
          lastProgress = currentProgress;
        }
      };
      cycle();
      
    };
    
    // EVENT
    g_onCanvasClick_isRunning = false;
    var onCanvasClick = function(e) {
      if(g_onCanvasClick_isRunning) return;
      g_onCanvasClick_isRunning = true;
      var x = e.clientX-$(canvas).position().left;
      var y = e.clientY-$(canvas).position().top+$().scrollTop();
      var brickX = Math.floor( x / brickSize.w );
      var brickY = Math.floor( gridSize.h - y / brickSize.h );
      if(game.Grid.isDestroyable(brickX, brickY)) {
        
        var columns = game.Grid.getColumns();
        
        var destroyed = (g_hoverDestroyed!=null && g_oldBrickHover!=null && g_oldBrickHover.x==brickX && g_oldBrickHover.y==brickY) ? 
        g_hoverDestroyed : game.Grid.computeDestroy(brickX, brickY);
        
        setDestroyHover(false);
        
        animateDestroyed(destroyed, function(destroyed) {
          drawDestroyed(destroyed);
          game.Grid.applyDestroy(destroyed);
          
          animateGravity(game.Grid.computeGravity(), function() {
            setDestroyHover(true);
            drawMap();
            g_onCanvasClick_isRunning = false;
            if(game.Grid.noMoreDestroyable())
              end();
            else
              $(canvas).one('click', onCanvasClick);
          });
        });
      }
      else {
        g_onCanvasClick_isRunning = false;
        $(canvas).one('click', onCanvasClick);
      }
    };
    
    var onMouseOut = function(e) {
      if(!destroyHoverOn) return;
      game.CanvasBack.clean();
      g_oldBrickHover = null;
    };
    
    var onMouseMove = function(e) {
      if(!destroyHoverOn) return;
      var x = e.clientX-$(canvas).position().left;
      var y = e.clientY-$(canvas).position().top+$().scrollTop();
      var brick = {x: Math.floor( x / brickSize.w ), y: Math.floor( gridSize.h - y / brickSize.h )};
      
      if(!g_oldBrickHover || !(g_oldBrickHover.x==brick.x && g_oldBrickHover.y==brick.y)) {
        g_oldBrickHover = brick;
        g_hoverDestroyed = game.Grid.computeDestroy(brick.x, brick.y);
        game.CanvasBack.clean();
        game.CanvasBack.drawHover(g_hoverDestroyed);
      }
    };
    
    /**
     * Bind the destroyable bricks hover
     */
    var bindHover = function() {
      g_hoverDestroyed = null;
      $(canvas).mouseout(onMouseOut);
      $(canvas).mousemove(onMouseMove);
      game.CanvasBack.drawHover();
    };
    
    // DRAWS
    
    /**
     * Update the display to remove destroyed bricks
     * destroy : list of points ( array of position {x, y} )
     */
    var drawDestroyed = function(destroyed) {
      for(b in destroyed) {
        var bp = brickPosition2canvasPosition(destroyed[b].x, destroyed[b].y);
        ctx.clearRect(bp.x,bp.y,brickSize.w,brickSize.h);
      }
    };
    
    /**
     * Draw all bricks
     */
    var drawMap = function() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      var columns = game.Grid.getColumns();
      for(var x=0; x<columns.length; ++x) {
        var column = columns[x];
        for(var y=0; y<column.length; ++y) {
          if(column[y]!=null) {
            ctx.fillStyle= colors[column[y]];
            var bp = brickPosition2canvasPosition(x, y);
            drawBrick(bp.x, bp.y);
          }
        }
      }
    };
    
    /**
     * Draw a specific brick
     * @arg x y : brick position
     */
    var drawBrick = function(x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(brickSize.w,brickSize.h);
      ctx.clearRect(0,0,1,1);
      ctx.beginPath();
      ctx.arc(.5, .5, .4, 0, Math.PI*2, true);
      ctx.fill();
      ctx.restore();
    };
    
    // UPDATES
    
    var updateBrickSize = function() {
      brickSize = {w: (canvasSize.w/gridSize.w), h: (canvasSize.h/gridSize.h)};
    };
    
    var updateWindowSize = function() {
      canvas.width = window.innerWidth-5;
      canvas.height = window.innerHeight-$('#optionsContainer').height()-42;
      
      canvasSize = { w:$(canvas).width(), h:$(canvas).height() };
      updateBrickSize();
      game.CanvasBack.updateSize();
    };
    
    var updateOptionAnimation = function() {
      animation = $('#animation').is(':checked');
    };
    
    var updateOptionNbColor = function() {
      nbColor = parseInt($('#colorNumber option:selected').val());
    };
    
    var updateOptionGridSize = function() {
      var gridSizeText = $('#gridSize option:selected').text();
      var i = gridSizeText.indexOf('x');
      gridSize = {w:parseInt(gridSizeText.substring(0,i)), h:parseInt(gridSizeText.substring(i+1))};
      updateBrickSize();
      newgame();
    };
    
    // MENUS
    
    /**
     * new game
     */
    var newgame = function() {
      $(canvas).unbind('click');
      $(canvas).one('click', onCanvasClick);
      setCursor(false);
      setDestroyHover(true);
      game.Grid.generate(gridSize.w,gridSize.h,nbColor);
      drawMap();
    };
    
    /**
     * end of game
     */
    var end = function() {
      setDestroyHover(false);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px serif';
      ctx.textBaseline = 'middle';
      var text = (game.Grid.getColumns().length==0?'you win !':'you lose !');
      ctx.fillText(text,(canvasSize.w-ctx.measureText(text).width)/2,canvasSize.h/2);
      setCursor(true);
      $(canvas).one('click', newgame);
    };
    
    return {
      init: function() {
        var canv = $('<canvas />')[0];
        if(!canv.getContext||!canv.getContext('2d')) {
          $('#error').empty().append('<p>Please use a HTML5 suppliant browser like firefox or chrome.</p>').show();
          return;
        }
        $('#error').remove();
        $('#gameContainer').show();
        
        canvas =  document.getElementById('sameGame');  
        ctx = canvas.getContext('2d');
        
        // Window resize init
        updateWindowSize();
        $(window).resize(function() {
          updateWindowSize();
          drawMap();
        });
        
        // Options init
        for(var i=3; i<=colors.length; ++i)
          $('#colorNumber').append('<option value="'+i+'">'+i+'</option>');
        updateOptionAnimation();
        updateOptionNbColor();
        updateOptionGridSize();
        $('#animation').change(function() {
          updateOptionAnimation();
        });
        $('#colorNumber').change(function() {
          updateOptionNbColor();
          newgame();
        });
        $('#gridSize').change(function() {
          updateOptionGridSize();
          newgame();
        });
        
        // Hover init
        bindHover();
        
        newgame(); // start the game
      },
      getBrickSize: function() {
        return brickSize;
      },
      getGridSize: function() {
        return gridSize;
      }
    }
  }();
  $(document).ready(game.Canvas.init);
  
}());
