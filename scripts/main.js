/**
 * AlfaV Play inspired me to start writing this:
 * https://code.sololearn.com/WOeWZxyB7Tdv/?ref=app
 * https://www.sololearn.com/Profile/6240952/?ref=app
 * With the help from video by The Coding Train (Daniel Shiffman):
 * https://youtu.be/flxOkx0yLrY
 */

/* jshint esversion: 5, unused: true, undef: true */
/* global v6, _, platform */

;( function ( window ) {

'use strict';

var min = Math.min,
    max = Math.max,
    pow = Math.pow,
    sqrt = Math.sqrt,
    rand = Math.random,
    floor = Math.floor;

var MAP_SIZE = 5000,
    BLOB_SIZE = 10,
    FOOD_SIZE = 7.5,
    /** Thanks to @Aaron Eberhard. I didn't knew about this feature. */
    MAX_BLOB_RADIUS = 500,
    STICK_BIG_R = 45;

var KEYS = {
  SPACE: 32
};

/** A bit of boredom that does not apply to the game. */

/** WebGL slow in iOS Safari and on PC. */
/* var safari = platform.os &&
  platform.os.family === 'iOS' &&
  platform.name === 'Safari'; */

var touchable = 'ontouchend' in window,
    mode = '2d'; // touchable && !safari ? 'webgl' : '2d';

var intersects = {
  'rectangle-point': function ( x1, y1, w1, h1, x2, y2 ) {
    return x2 < x1 + w1 && x2 > x1 && y2 < y1 + h1 && y2 > y1;
  },

  'circle-point': function ( x1, y1, r1, x2, y2 ) {
    return sqrt( ( x2 - x1 ) * ( x2 - x1 ) + ( y2 - y1 ) * ( y2 - y1 ) ) < r1;
  }
};

if ( touchable ) {
  var SMALL_R = STICK_BIG_R * 0.6;

  /** Makes from 3D-like normalized coordinates 2D. */
  var foo = function ( value, size ) {
    return ( value + 1 ) * 0.5 * size;
  };

  /** Converts touch zone with 3D coordinates in 2D. */
  var get_touch_zone = function ( values, w, h ) {
    var x1 = foo( values[ 0 ], w ),
        y1 = foo( values[ 1 ], h ),
        x2 = foo( values[ 2 ], w ),
        y2 = foo( values[ 3 ], h );

    return [
      x1, y1, x2 - x1, y2 - y1
    ];
  };

  var execute_listener = function ( object, name, event ) {
    if ( object[ name ] ) {
      object[ name ].call( object, event );
    }
  };

  /** One stick of gamepad. */
  var Stick = function ( options ) {
    var renderer_options = {
      // transparency in the webgl renderer is now broken
      mode: '2d'
    };

    var that = this,
        renderer = that.renderer =
          v6( renderer_options ).noStroke(),
        identifiers = that._identifiers = [],
        start = that.start = v6.vec2(),
        location = that.location = v6.vec2(),
        touch_zone;

    that.state = 0;
    that.redraw = true;

    var touchstart = function ( event ) {
      var touches = event.changedTouches,
          i = touches.length,
          unset = true,
          touch, touched, x, y;

      while ( i > 0 ) {
        touch = touches[ --i ];

        /** A finger on the stick touch zone? */
        touched = identifiers[ touch.identifier ] =
          intersects[ 'rectangle-point' ](
            touch_zone[ 0 ],
            touch_zone[ 1 ],
            touch_zone[ 2 ],
            touch_zone[ 3 ],
            x = touch.clientX,
            y = touch.clientY );

        /** If yes, and this last event from the `touches` (reverse loop). */
        if ( touched && unset ) {
          /** Then handle it! */
          start.set( x, y );
          that.state = 1;
          that.redraw = unset = true;
          that._angle = that._value = null;
        }
      }
    };

    var touchmove = function ( event ) {
      var touches = event.changedTouches,
          i = touches.length,
          touch;

      while ( i > 0 ) {
        /** if this finger interacts with the stick (on `touchstart` was in the touch zone). */
        if ( identifiers[ ( touch = touches[ --i ] ).identifier ] ) {
          /** Move the movable part of the stick. */
          location
            .set( touch.clientX - start[ 0 ], touch.clientY - start[ 1 ] )
            .limit( STICK_BIG_R );
          that.state = 2;
          that.redraw = true;
          that._angle = that._value = null;
          break;
        }
      }
    };

    var touchend = function ( event ) {
      var touches = event.changedTouches,
          i = touches.length,
          unset = true,
          id;

      while ( i > 0 ) {
        if ( identifiers[ id = touches[ --i ].identifier ] ) {
          if ( unset ) {
            that.cancel();
            unset = true;
          }

          identifiers[ id ] = false;
        }
      }
    };

    var resize = function ( event ) {
      if ( event ) {
        renderer.fullwindow();
      }

      touch_zone = get_touch_zone(
        options.touch_zone,
        renderer.width,
        renderer.height );

      that.x = foo( options.x, renderer.width );
      that.y = foo( options.y, renderer.height );
      that.cancel();
    };

    resize();

    _( window )
      .on( 'touchstart', touchstart )
      .on( 'touchmove', touchmove )
      .on( 'touchend', touchend )
      .on( 'resize', resize );
  };

  Stick.prototype = {
    show: function () {
      this.renderer
        .restore()
        .clear()
        .save()
        .setTransform( 1, 0, 0, 1, this.start[ 0 ], this.start[ 1 ] )
        .fill( this.colors[ this.state ] )
        .arc( 0, 0, STICK_BIG_R )
        .arc( this.location[ 0 ], this.location[ 1 ], SMALL_R );

      this.redraw = false;
      return this;
    },

    value: function () {
      if ( this._value == null ) {
        this._value = this.location.mag() / STICK_BIG_R;
      }

      return this._value;
    },

    angle: function () {
      if ( this._angle == null ) {
        this._angle = this.location.angle();
      }

      return this._angle;
    },

    cancel: function () {
      this.location.set( 0, 0 );
      this.start.set( this.x, this.y );
      this.state = 0;
      this.redraw = true;
      this._angle = this._value = null;
      this._identifiers.length = 0;
      return this;
    },

    colors: [
      v6.rgba( 0, 0.05 ),
      v6.rgba( 0, 0.075 ),
      v6.rgba( 0, 0.1 )
    ],

    constructor: Stick
  };

  var Button = function ( x, y ) {
    var touchstart = function ( event ) {
      var touches = event.changedTouches,
          i = touches.length,
          touch;

      while ( i > 0 ) {
        touch = touches[ --i ];

        /** If a finger on the button, then say it. */
        if ( intersects[ 'circle-point' ](
          that.x,
          that.y,
          STICK_BIG_R,
          touch.clientX,
          touch.clientY ) )
        {
          that.state = that.redraw = identifiers[ touch.identifier ] = true;
          execute_listener( that, 'ontouchstart', event );
          break;
        }
      }
    };

    var touchmove = function ( event ) {
      var touches = event.changedTouches,
          len = touches.length,
          i = 0,
          touch, id;

      for ( ; i < len; ++i ) {
        touch = touches[ i ];
        id = touch.identifier;

        /** If a finger on the button, then say it. */
        if ( intersects[ 'circle-point' ](
          that.x,
          that.y,
          STICK_BIG_R,
          touch.clientX,
          touch.clientY ) )
        {
          if ( !that.state ) {
            that.state = that.redraw = true;
          }

          identifiers[ id ] = true;

        /** Otherwise, if this finger was on the button before. */
        } else if ( identifiers[ id ] ) {
          that.finger_removed_from_button( id );
        }
      }
    };

    var touchend = function ( event ) {
      var touches = event.changedTouches,
          i = touches.length,
          id;

      while ( i > 0 ) {
        /** If this finger was on the button before. */
        if ( identifiers[ id = touches[ --i ].identifier ] ) {
          that.finger_removed_from_button( id );
          execute_listener( that, 'ontouchend', event );
        }
      }
    };

    var that = this,
        identifiers = that._identifiers = [];

    that.state = false;
    that.redraw = true;

    that.renderer = v6( {
      // transparency in the webgl renderer is now broken
      mode: '2d'
    } )
      .noStroke();

    that.x = foo( x, that.renderer.width );
    that.y = foo( y, that.renderer.height );

    _( window )
      .on( 'touchstart', touchstart )
      .on( 'touchmove', touchmove )
      .on( 'touchend', touchend );
  };

  Button.prototype = {
    show: function () {
      this.renderer
        .clear()
        .fill( this.colors[ this.state ] )
        .arc( this.x, this.y, STICK_BIG_R );

      this.redraw = false;
      return this;
    },

    finger_removed_from_button: function ( id ) {
      /** For not to change the state to the same value multiple times. */
      if ( this.state ) {
        this.state = false;
        this.redraw = true;
      }

      /** Say that this finger is no longer on the button. */
      this._identifiers[ id ] = null;
    },

    cancel: function () {
      this.state = false;
      this.redraw = true;
      this._identifiers.length = 0;
      return this;
    },

    colors: {
      'false': v6.rgba( 0, 0.05 ),
      'true' : v6.rgba( 0, 0.1 )
    },

    constructor: Button
  };
} else {
  var keys = [];

  var mousemove = function ( event ) {
    /* mouse.set(
      event.changedTouches[ 0 ].clientX,
      event.changedTouches[ 0 ].clientY ); */
    mouse.set( event.clientX, event.clientY );
  };

  var keydown = function ( event ) {
    keys[ event.keyCode ] = true;
  };

  var keyup = function ( event ) {
    if ( event.keyCode === KEYS.SPACE ) {
      divided = false;
    }

    keys[ event.keyCode ] = false;
  };

  _( window )
    .mousemove( mousemove )
    .keydown( keydown )
    .keyup( keyup );
}

var Food = function ( x, y, r ) {
  this.r = r;
  this.eaten = false;
  this.pos = v6.vec2( x, y );
  this.color = v6.hsla( _.random( 360 ), 100, 50 );
};

Food.prototype = {
  show: function () {
    var x = this.pos[ 0 ],
        y = this.pos[ 1 ],
        r = this.r;

    if ( camera.sees( x - r, y - r, r * 2, r * 2 ) ) {
      renderer
        .fill( this.color )
        .noStroke()
        .polygon( x, y, r, 8 );
    }
  },

  constructor: Food,
  score: 1,
  type: 'food'
};

var Blob = function ( x, y, r ) {
  if ( typeof x == 'object' ) {
    this.r = x.r = sqrt( x.r * x.r * 0.5 );
    this.eaten = false;
    this.pos = x.pos
      .copy()
      .add( x.vel.copy().setMag( x.r * 2 ) );
    this.vel = x.vel.copy().mult( 2.5 );
    this.color = x.color;
    this.stroke_color = x.stroke_color;
    this.score = x.score *= 0.5;
    this.base = x;
  } else {
    Food.call( this, x, y, r );
    this.vel = v6.vec2();
    this.score = this.r;
    this.stroke_color = this.color.shade( -10 );
  }

  this.acc = v6.vec2();
};

Blob.prototype = _.assign( {}, Food.prototype, {
  show: function () {
    var x = this.pos[ 0 ],
        y = this.pos[ 1 ],
        r = this.r;

    if ( camera.sees( x - r, y - r, r * 2, r * 2 ) ) {
      renderer
        .stroke( this.stroke_color )
        .fill( this.color )
        .arc( x, y, r );
    }
  },

  update: function ( dt ) {
    var steer;

    // this equation taken from
    // https://amp.reddit.com/r/Agario/comments/6f0njp/movement_speed_equation/
    this.speed = 2.2 * pow( this.r, -0.439 ) * 350;

    if ( this.pos[ 0 ] < 0 ) {
      steer = v6.vec2( this.speed, this.vel[ 1 ] );
    } else if ( this.pos[ 1 ] < 0 ) {
      steer = v6.vec2( this.vel[ 0 ], this.speed );
    } else if ( this.pos[ 0 ] > MAP_SIZE ) {
      steer = v6.vec2( -this.speed, this.vel[ 1 ] );
    } else if ( this.pos[ 1 ] > MAP_SIZE ) {
      steer = v6.vec2( this.vel[ 0 ], -this.speed );
    }

    if ( steer ) {
      steer
        .normalize()
        .mult( this.speed )
        .sub( this.vel )
        .limit( this.force );

      this.acc.add( steer );
    }

    this.pos.add( this.vel
      .add( this.acc )
      .limit( this.speed )
      .copy()
      .mult( dt ) );

    this.acc.set( 0, 0 );
    this.vel.mult( 0.975 );
  },

  eat: function ( food ) {
    if ( this.base === food ) {
      return;
    }

    this.score += food.score;
    food.eaten = true;

    if ( this.r >= MAX_BLOB_RADIUS ) {
      return;
    }

    this.r = min( sqrt( this.r * this.r + food.r * food.r ), MAX_BLOB_RADIUS );
  },

  divide: function () {
    if ( this.r > FOOD_SIZE * 2 ) {
      blobs.push( new Blob( this ) );
    }
  },

  dist: function ( other ) {
    return this.pos.dist( other.pos ) - this.r - other.r;
  },

  constructor: Blob,
  speed: 0,
  force: 20,
  type: 'blob'
} );

var create_dna = function () {
  return [
    _.random( 0.6, 1, true ),
    _.random( -1, -0.6, true ),
    _.random( 200, 400, true ),
    _.random( 200, 400, true )
  ];
};

var Robot = function ( x, y, r ) {
  Blob.call( this, x, y, r );
  this.dna = create_dna();
};

Robot.prototype = _.assign( {}, Blob.prototype, {
  seek_closest: function ( objects, look_for_food ) {
    var i = objects.length - 1,
        largest_radius = 0,
        shortest_dist = Infinity,
        other, dist, closest, perception;

    if ( look_for_food ) {
      perception = this.dna[ 2 ];
    } else {
      perception = this.dna[ 3 ];
    }

    for ( ; i >= 0; --i ) {
      other = objects[ i ];

      if ( other === this || other.eaten ) {
        continue;
      }

      if ( look_for_food ? other.r > this.r : this.r > other.r ) {
        continue;
      }

      dist = this.dist( other );

      if ( dist >= 0 &&
           dist < perception &&
           ( dist < shortest_dist ||
           other.r >= largest_radius ) )
      {
        largest_radius = other.r;
        shortest_dist = dist;
        closest = other;
      }
    }

    if ( closest ) {
      this.seek( closest.pos, look_for_food );
      this.__target = null;
    } else if ( look_for_food ) {
      if ( !this.__target || this.__target.dist( this.pos ) < this.r + 50 ) {
        this.__target = v6.vec2( _.random( MAP_SIZE ), _.random( MAP_SIZE ) );
      }

      this.seek( this.__target, true );
    }
  },

  seek: function ( target, look_for_food ) {
    var attraction, attraction_force;

    if ( look_for_food ) {
      attraction = this.dna[ 0 ];
    } else {
      attraction = this.dna[ 1 ];
    }

    attraction_force = target
      .copy()
      .sub( this.pos )
      .setMag( this.speed )
      .sub( this.vel )
      .limit( this.force )
      .mult( attraction );

    this.acc.add( attraction_force );
  },

  take_the_world: function ( objects ) {
    this.seek_closest( objects );
    this.seek_closest( objects, true );
  },

  constructor: Robot,
  force: 10,
  type: 'robot'
} );

var time_of_last_added_blob = 0;

var update = function ( dt ) {
  var last_blob_index, max_radius, blob, force, i, j, other;

  if ( blobs.length < 400 &&
       this.total - time_of_last_added_blob > 0.1 )
  {
    if ( rand() < 0.05 ) {
      blobs.push( generate( Robot, BLOB_SIZE ) );
    } else {
      blobs.push( generate( Food, FOOD_SIZE ) );
    }

    time_of_last_added_blob = this.total;
  }

  last_blob_index = blobs.length - 1;try{

  if ( !touchable ) {
    force = mouse
      .copy()
      .sub( camera.shouldLookAt()
        .sub( camera.looksAt() )
        .mult( camera.scale[ 0 ] )
        .add( renderer.width * 0.5, renderer.height * 0.5 ) )
      .limit( STICK_BIG_R )
      .div( STICK_BIG_R )
      .mult( player.force );
  } else if ( stick.state === 2 ) {
    force = v6.Vector2D
      .fromAngle( stick.angle() )
      .mult( stick.value() * player.force );
  }

  if ( force ) {
    player.acc.add( force );
  }

  if ( ( touchable ? button.state : keys[ KEYS.SPACE ] ) && !divided ) {
    player.divide();
    divided = true;
  }
} catch ( e ) { alert( e ); }
  for ( i = last_blob_index; i >= 0; --i ) {
    blob = blobs[ i ];

    if ( blob.type === 'robot' ) {
      blob.take_the_world( blobs );
    }

    if ( blob.type !== 'food' ) {
      blob.update( dt );
    }
  }

  for ( i = last_blob_index; i >= 0; --i ) {
    blob = blobs[ i ];

    if ( blob.type === 'food' ) {
      continue;
    }

    for ( j = last_blob_index; j >= 0; --j ) {
      other = blobs[ j ];

      if ( blob !== other &&
           blob.r > other.r &&
           blob.dist( other ) < 0 )
      {
        blob.eat( other );
      }
    }  
  }

  for ( i = last_blob_index; i >= 0; --i ) {
    blob = blobs[ i ];

    if ( blob.eaten ) {
      if ( blob === player ) {
        blobs[ i ] = player = generate( Blob, BLOB_SIZE );
      } else {
        blobs.splice( i, 1 );
      }
    }
  }

  max_radius = min( renderer.width, renderer.height ) / 17.5;

  if ( player.r * camera.scale[ 0 ] + 1 < max_radius ) {
    camera.zoomIn();
  } else if ( player.r * camera.scale[ 0 ] > max_radius ) {
    camera.zoomOut();
  }

  camera
    .lookAt( player.pos )
    .update();

  blobs.sort( sort_blobs );
};

var sort_blobs = function ( a, b ) {
  return b.r - a.r;
};

var render = function () {
  var spacing = 200,
      x = spacing,
      i;

  renderer
    .restore()
    .save()
    .backgroundColor( 255 )
    .setTransformFromCamera( camera )
    .lineWidth( 1 / camera.scale[ 0 ] )
    .stroke( 102 )
    .noFill()
    /** Draw the map border. */
    .rect( 0, 0, MAP_SIZE, MAP_SIZE )
    .stroke( 204 );

  /** Since the map is square, we can use only one loop to draw the grid. */
  for ( ; x < MAP_SIZE; x += spacing ) {
    renderer
      .line( x, 0, x, MAP_SIZE )
      .line( 0, x, MAP_SIZE, x );
  }

  renderer.lineWidth( 5 / camera.scale[ 0 ] );

  for ( i = blobs.length - 1; i >= 0; --i ) {
    blobs[ i ].show();
  }

  if ( touchable ) {
    if ( button.redraw ) {
      button.show();
    }

    if ( stick.redraw ) {
      stick.show();
    }
  }

  if ( score !== player.score ) {
    ui[ '#score' ].text( floor( score = player.score ) );
  }
};

var generate = function ( Food, r ) {
  var pad = 50,
      x = _.random( pad, MAP_SIZE - pad ),
      y = _.random( pad, MAP_SIZE - pad );

  return new Food( x, y, r );
};

var reset = function () {
  var blobs_len = blobs.length = 200;

  blobs[ 0 ] = player = generate( Blob, BLOB_SIZE );
  ui[ '#score' ].text( score = 0 );

  while ( --blobs_len > 0 ) {
    if ( rand() < 0.05 ) {
      blobs[ blobs_len ] = generate( Robot, BLOB_SIZE );
    } else {
      blobs[ blobs_len ] = generate( Food, FOOD_SIZE );
    }
  }
};

var ui = {
  init: function () {
    this[ '#score' ] = _( '#score' );
  }
};

var blobs = [],
    divided = false,
    score, renderer, stick, button, camera, player, mouse;

_( function () {
  renderer = v6( {
    mode: mode // default '2d'
  } );

  window.document.body.style.background =
    renderer.canvas.style.background = '#fff';

  camera = renderer.camera( {
    speed: [
      0.15,   // x
      0.15,   // y
      0.0035, // zoom in
      0.0025  // zoom out
    ],

    scale: [
      0.9,  // scale
      0.05, // min scale (zoom out)
      0.9   // max scale (zoom in)
    ]
  } );

  if ( touchable ) {
    stick = new Stick( {
      touch_zone: [
        0, 0, 1, 1
      ],

      x: 0.5,
      y: 0.5
    } );

    button = new Button( -0.5, 0.5 );

    button.ontouchend = function () {
      divided = false;
    };
  } else {
    mouse = v6.vec2( renderer.width * 0.5, renderer.height * 0.5 );
  }

  ui.init();
  reset();

  v6.ticker( update, render )
    .tick();
} );

} )( this );
