/*
 *  Extends the GLIMAGECANVAS 
 */
function GLINTERACTIVELOGO(canvasid, image_src){
    //call the constructor of the GLIMAGECANVAS object
    GLIMAGECANVAS.call(this,canvasid,image_src);
    
    //index for the shader program used for the logo
    this.logo_prog = undefined;
}

GLINTERACTIVELOGO.prototype = Object.create(GLIMAGECANVAS.prototype);

GLINTERACTIVELOGO.prototype.vs = `
attribute vec4 position;
attribute vec2 texcoord;

varying vec2 uv;

void main()
{
  gl_Position = position;
  uv = texcoord;
}
`;

GLINTERACTIVELOGO.prototype.fs = `

precision mediump float;

varying vec2 uv;

uniform sampler2D u_image;
//uniform sampler2D noise;
//uniform sampler2D ndtex;
//uniform sampler2D ndprev;

uniform vec2 source_pt;
uniform float source_d;
uniform int source_t;
uniform bool add_source;

void main() {
    vec4 tcol = texture2D(u_image, uv);
    gl_FragColor = tcol.bgra;
}

`;



GLIMAGECANVAS.prototype.resizeGL = function(){
    //resize canvas to be pixel accurate with the screen
    if(twgl.resizeCanvasToDisplaySize(this.canvas,window.devicePixelRatio)){
        //resize freambuffer
        twgl.resizeFramebufferInfo(this.gl,this.fbo,this.fbo_attachments,this.canvas.width,this.canvas.height);
        this.dirty = true;
    }
    //resize the viewport of the fbo to the entire canvas
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.fbo.framebuffer);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);

    var status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if(status != this.gl.FRAMEBUFFER_COMPLETE){
        console.log("ResizeGL Framebuffer status: " + status);
    }

    //resize the viewport of the default framebuffer to the entire canvas
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
}


GLINTERACTIVELOGO.prototype.initGL = function(){
    //check for floating point texture support
    var floatTextures = this.gl.getExtension('OES_texture_float');
    var linearTexture = this.gl.getExtension('OES_texture_float_linear');
    if (!floatTextures || !linearTexture) {
        console.log("Interactive Logo Init GL, No floating point texture support");
        return false;
    }

    //call glimagecanvas.initGL
    GLIMAGECANVAS.prototype.initGL.call(this);

    this.logo_prog = this.addGLProg(this.vs,this.fs);

    var gl = this.gl;

    //create framebuffers with the proper size and multiple render textures
    this.fbo_attachments = [
        {
            format: gl.RGBA, 
            type: gl.FLOAT, 
            minMag: gl.LINEAR
            
        },
        {
            format: gl.DEPTH_STENCIL
        }
    ];

    this.fbo = twgl.createFramebufferInfo(this.gl,this.fbo_attachments,this.canvas.width,this.canvas.height);
    var status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if(status != this.gl.FRAMEBUFFER_COMPLETE){
        console.log("ResizeGL Framebuffer status: " + status);
    }

    return true;

}

GLINTERACTIVELOGO.prototype.render = function(){
    this.resizeGL();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.fbo.framebuffer);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);

    var proginfo = this.glprogs[this.logo_prog];
    this.gl.useProgram(proginfo.program);

    var texind = this.images[this.images.length-1].texind;
    var gl_tex = this.gltexs[texind];
    var uniforms = this.gluniforms[this.logo_prog];
    uniforms.u_image = gl_tex;
    twgl.setUniforms(proginfo, uniforms);

    //add full screen quad geometry
    var objbuff = this.globjs[this.fsq_ind];
    twgl.setBuffersAndAttributes(this.gl, proginfo, objbuff);

    this.gl.drawElements(this.gl.TRIANGLES, objbuff.numElements, this.gl.UNSIGNED_SHORT, 0);


    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);
    this.blittex(this.fbo.attachments[0]);


}