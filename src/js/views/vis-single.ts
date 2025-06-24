import { convertImage } from "./tool--image-data-to-bitmap";
import { CanvasSizeManager } from "./canvas-size-manager";
import { VisView } from "./vis-view";

declare const GSDLWavesurfer: any; /* GSLD mod */

type SingleVisualisationPainterArgs = {
  wrapper: HTMLElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  canvasSizeManager: CanvasSizeManager;
};

type SingleVisualisationStartArgs = {
  image: Uint8ClampedArray;
  bpm: number;
  colors: {
    similar: string;
    diff: string;
  };
};

const RENDERER_DEBUG = false;

export class SingleVisualisationPainter implements VisView {
  wrapper;
  canvas;
  context;
  canvasSizeManager;

    _image : any = null;
    _isPaused = false;
    _animationFrameId: number | null = null;
    _elapsedIntervals = 0;
    
    _interval   = 0;  // msec per column
    _startTime  = 0;
    
    _position: { x: number; y: number; perc_x: number; perc_y: number } | undefined = undefined;

  constructor({
    wrapper,
    canvas,
    context,
    canvasSizeManager,
  }: SingleVisualisationPainterArgs) {
    this.wrapper = wrapper;
    this.canvas = canvas;
    this.context = context;
    this.canvasSizeManager = canvasSizeManager;
  }

  show(): void {
    this.wrapper.classList.remove("hidden");
    this.canvasSizeManager.triggerResize();
  }


  draw() : void {
      this.context.imageSmoothingEnabled = false;
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const wholeImageControl = <HTMLInputElement>(
        document.getElementById("show-whole-image")
      );
      const cursorControl = <HTMLInputElement>(
        document.getElementById("show-cursor")
      );
      const magnifierControl = <HTMLInputElement>(
        document.getElementById("show-magnifier")
      );

      if (wholeImageControl.checked) {
        this.context.drawImage(
          this._image,
          0,
          0,
          this._image.width,
          this._image.width,
          0,
          0,
          this.canvas.width,
          this.canvas.width
        );

	const scaleImageToCanvas = this.canvas.width / this._image.width;

	const zoom = 4; // of the canvas size
	const scaleCanvasToZoom = zoom;
	  
        const canvasPixelSize = this.canvas.width / this._image.width;
	  
	const progressOnImage  = this._elapsedIntervals;
        const progressOnCanvas = progressOnImage * scaleImageToCanvas - (canvasPixelSize/2);
	const progressOnZoom   = progressOnCanvas * scaleCanvasToZoom;

	const position = this._position;
	  
        if (cursorControl.checked) {
          const path = new Path2D();

          path.moveTo(0, progressOnCanvas);
          path.lineTo(progressOnCanvas, progressOnCanvas);
          path.lineTo(progressOnCanvas, 0);
          this.context.lineWidth = Math.max(canvasPixelSize, 1);
          this.context.strokeStyle = "white"; /* GSDL mod */
          this.context.stroke(path);
        }

	if (RENDERER_DEBUG) {
	    const position_stringify = (position) ? JSON.stringify(position) : "";
            console.log(`position: ${position_stringify}, imageWidth=${this._image.width} canvasWidth=${this.canvas.width}`);
	}
	  
	if (magnifierControl.checked) {

	    
            if (position !== undefined && this._image.width * zoom > this.canvas.width) {
		if (RENDERER_DEBUG) {
		    console.log("Drawing zoomed in");
		}
		const positionOnCanvas = position;

		const positionOnZoom_x = position.x * scaleCanvasToZoom;
		const positionOnZoom_y = position.y * scaleCanvasToZoom;
		
		const zoomBoxSize = this.canvas.width / 4;
		const zoomBoxOffset = zoomBoxSize / 2;
		
		const proportionalSize = this._image.width / (this.canvas.width * zoom);
		const proportionalOffset = proportionalSize * zoomBoxOffset;
		
		const imageX = position.perc_x * this._image.width - proportionalOffset;
		const imageY = position.perc_y * this._image.height - proportionalOffset;
		const imageSize = proportionalOffset * 2;

		if (RENDERER_DEBUG) {
		    console.log(`Magnifier: imageX=${imageX} imageY=${imageY} mag-image-box-size=${imageSize} `);
		}
		
		this.context.drawImage(
		    this._image,
		    imageX,
		    imageY,
		    imageSize,
		    imageSize,
		    position.x - zoomBoxOffset,
		    position.y - zoomBoxOffset,
		    zoomBoxSize,
		    zoomBoxSize
		);

		const border_xl = position.x - zoomBoxOffset;
		const border_yt = position.y - zoomBoxOffset;
		const border_xr = border_xl + zoomBoxSize -1;
		const border_yb = border_yt + zoomBoxSize -1;

		//console.log(`Magnifier box screen coords: (${border_xl},${border_yt})->(${border_xr},${border_yb})`);
			    
		if (cursorControl.checked) {
		    this.context.lineWidth = Math.max(canvasPixelSize, 1);
		    this.context.strokeStyle = "white"; 

		    const translatePositionOnZoomToCanvas_x = positionOnCanvas.x - positionOnZoom_x;
		    const translatePositionOnZoomToCanvas_y = positionOnCanvas.y - positionOnZoom_y;
		    
		    const progressWithinMagOnCanvas_x = progressOnZoom + translatePositionOnZoomToCanvas_x;
		    const progressWithinMagOnCanvas_y = progressOnZoom + translatePositionOnZoomToCanvas_y;		    

		    // //console.log(`progressWthinMagOnCanvas: (${progressWithinMagOnCanvas_x},${progressWithinMagOnCanvas_y})`);
		    
		    const progress_horz_beyond_xl = (progressWithinMagOnCanvas_x >= border_xl);
		    const progress_vert_beyond_yt = (progressWithinMagOnCanvas_y >= border_yt);

		    // //console.log(` -- progress_horz_beyond_xl   = ${progress_horz_beyond_xl}   | progress_vert_beyond_yt = ${progress_vert_beyond_yt}`);
		    
		    const progress_vert_within_xl_xr = (progressWithinMagOnCanvas_x >= border_xl) && (progressWithinMagOnCanvas_x <= border_xr);
		    const progress_horz_within_yt_yb = (progressWithinMagOnCanvas_y >= border_yt) && (progressWithinMagOnCanvas_y <= border_yb);
											  

		    // //console.log(`  | progress_vert_within_xl_xr = ${progress_vert_within_xl_xr}  -- progress_horz_within_yt_yb = ${progress_horz_within_yt_yb}`);

		    
		    if (progress_horz_beyond_xl && progress_horz_within_yt_yb) {
			const clamp_xl = border_xl;
			const clamp_xr = Math.min(progressWithinMagOnCanvas_x,border_xr)
			
			const path_horz = new Path2D();			
			path_horz.moveTo(clamp_xl,progressWithinMagOnCanvas_y);
			path_horz.lineTo(clamp_xr,progressWithinMagOnCanvas_y);
			
			this.context.stroke(path_horz);
		    }

		    if (progress_vert_beyond_yt && progress_vert_within_xl_xr) {
			const clamp_yt = border_yt;
			const clamp_yb = Math.min(progressWithinMagOnCanvas_y,border_yb)

			const path_vert = new Path2D();
			path_vert.moveTo(progressWithinMagOnCanvas_x,clamp_yt);
			path_vert.lineTo(progressWithinMagOnCanvas_x,clamp_yb);
			
			this.context.stroke(path_vert);
		    }

		}

		const pathBorder = new Path2D();
		
		pathBorder.moveTo(border_xl,border_yt);
		pathBorder.lineTo(border_xr,border_yt);
		pathBorder.lineTo(border_xr,border_yb);
		pathBorder.lineTo(border_xl,border_yb);
		pathBorder.closePath();
		this.context.lineWidth = Math.max(canvasPixelSize, 1);
		this.context.strokeStyle = "#FFFF00"; /* yellow */ /* GSDL mod */
		this.context.stroke(pathBorder);
		
		
	    }
        }
      } else {
        this.context.drawImage(
          this._image,
          0,
          0,
          this._elapsedIntervals,
          this._elapsedIntervals,
          0,
          0,
          this.canvas.width,
          this.canvas.width
        );
      }
    }


    
  runLoop(): void {
      this._animationFrameId = window.requestAnimationFrame(() => {
	  if (this._isPaused) return;

	  let elapsedMs = 0;
	  
	  if (typeof GSDLWavesurfer !== 'undefined') {
	      const audioTime = GSDLWavesurfer.getCurrentTime(); // seconds
	      elapsedMs = audioTime * 1000;
	  }
	  else {

	      elapsedMs = Date.now() - this._startTime
	  }	  
	  
	  this._elapsedIntervals = Math.min(
              this._image.width,
              Math.floor(elapsedMs / this._interval)
	  );
	  
	  this.draw();
	  
	  if (this._elapsedIntervals < this._image.width) {
              this.runLoop();
	  }
      });
  }



  pause(): void {
      if (!this._isPaused) {
	  this._isPaused = true;
	  if (this._animationFrameId !== null) {
              cancelAnimationFrame(this._animationFrameId);
              this._animationFrameId = null;
	  }
    }
  }
    
  resume(): void {
      if (this._isPaused) {
	  this._isPaused = false;
	  this.runLoop();
      }
  }
    
    
  async start({
    image: imageData,
    bpm,
    colors,
  }: SingleVisualisationStartArgs): Promise<void> {
    this._image = await convertImage(this.context, imageData);

    this.wrapper.style.setProperty("--color-similar", colors.similar);
    this.wrapper.style.setProperty("--color-diff", colors.diff);

    this._interval = 1000 / (bpm / 60);
    // The following is only needed if GSDLWavesurfer not defined  
    this._startTime = Date.now(); // **** consider changing this and others to performance.now()

    this._isPaused = false;      
    this._elapsedIntervals = 0;
      
    this._position = undefined;
      
    this.runLoop();
    /*  
    (function loop() {
      window.requestAnimationFrame(function () {
        this._elapsedIntervals = Math.min(
          this._image.width,
          Math.floor((Date.now() - startTime) / this._interval)
        );

        this.draw();

        if (this._elapsedIntervals < this._image.width) {
          loop();
        }
      });
    })();
    */

    let that = this;
      
    window.addEventListener("resize", function () {
      window.requestAnimationFrame(function () {
        that.draw();
      });
    });

    this.canvas.addEventListener("mousemove", function (evt: MouseEvent) {
	const rect = that.canvas.getBoundingClientRect(); // DOMRect relative to viewport

	that._position = {
	    x: evt.clientX - rect.left,
	    y: evt.clientY - rect.top,
	    perc_x: (evt.clientX - rect.left) / rect.width,
	    perc_y: (evt.clientY - rect.top) / rect.height,
	};
    });
      
      
    this.canvas.addEventListener("mouseleave", function () {
      that._position = undefined;
    });

  }
}
