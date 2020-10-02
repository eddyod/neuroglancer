/**
 * @license
 * Copyright 2016 Google Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {SliceView} from 'neuroglancer/sliceview/frontend';
import {MultiscaleVolumeChunkSource} from 'neuroglancer/sliceview/volume/frontend';
import {RenderLayerBaseOptions, SliceViewVolumeRenderLayer} from 'neuroglancer/sliceview/volume/renderlayer';
import {TrackableAlphaValue} from 'neuroglancer/trackable_alpha';
import {BLEND_FUNCTIONS, BLEND_MODES, TrackableBlendModeValue} from 'neuroglancer/trackable_blend';
import {WatchableValue} from 'neuroglancer/trackable_value';
import {glsl_COLORMAPS} from 'neuroglancer/webgl/colormaps';
import {makeTrackableFragmentMain, shaderCodeWithLineDirective, WatchableShaderError} from 'neuroglancer/webgl/dynamic_shader';
import {ShaderBuilder, ShaderProgram} from 'neuroglancer/webgl/shader';
import {addControlsToBuilder, parseShaderUiControls, setControlsInShader, ShaderControlsParseResult, ShaderControlState} from 'neuroglancer/webgl/shader_ui_controls';

/* START OF CHANGE: default rendering image layer */
/*
const DEFAULT_FRAGMENT_MAIN = `void main() {
  emitGrayscale(toNormalized(getDataValue()));
}
`;
 */
const DEFAULT_FRAGMENT_MAIN = `
#uicontrol float min slider(min=0, max=1, default=0)
#uicontrol float max slider(min=0, max=1, default=1)
#uicontrol float invert slider(min=0, max=1, default=0, step=1)
#uicontrol float brightness slider(min=-1, max=1)
#uicontrol float contrast slider(min=-3, max=3, step=0.01)
#uicontrol float gamma slider(min=0.05, max=2.5, default=1, step=0.05)
#uicontrol float linlog slider(min=0, max=1, default=0, step=1)
void main() {
  float limit = 45000.0;
  float pix_val = float(toRaw(getDataValue()));

  if (linlog==1.0) {
  	pix_val = log(pix_val);
   	limit = 10.0;
  } else {
    pix_val = pow(pix_val,gamma);
    limit = 45000.0;
  }


  pix_val = pix_val/limit;

  if(pix_val < min){
  	pix_val = 0.0;
  }
  if(pix_val > max){
    pix_val = 1.0;
  }

  if(invert==1.0){
    emitRGB(vec3(0,(1.0 -(pix_val - brightness)) * exp(contrast),0));
  }
  else{
     emitRGB(vec3(0, (pix_val + brightness) * exp(contrast),0));
  }

}
`;
/* END OF CHANGE: default rendering image layer */

export function getTrackableFragmentMain(value = DEFAULT_FRAGMENT_MAIN) {
  return makeTrackableFragmentMain(value);
}

export interface ImageRenderLayerOptions extends RenderLayerBaseOptions {
  shaderError: WatchableShaderError;
  opacity: TrackableAlphaValue;
  blendMode: TrackableBlendModeValue;
  shaderControlState: ShaderControlState;
}

export class ImageRenderLayer extends SliceViewVolumeRenderLayer<ShaderControlsParseResult> {
  opacity: TrackableAlphaValue;
  blendMode: TrackableBlendModeValue;
  shaderControlState: ShaderControlState;
  constructor(multiscaleSource: MultiscaleVolumeChunkSource, options: ImageRenderLayerOptions) {
    const {opacity, blendMode, shaderControlState} = options;
    super(multiscaleSource, {
      ...options,
      fallbackShaderParameters: new WatchableValue<ShaderControlsParseResult>(
          parseShaderUiControls(DEFAULT_FRAGMENT_MAIN)),
      encodeShaderParameters: p => p.source,
      shaderParameters: shaderControlState.parseResult,
    });
    this.shaderControlState = shaderControlState;
    this.opacity = opacity;
    this.blendMode = blendMode;
    this.registerDisposer(opacity.changed.add(this.redrawNeeded.dispatch));
    this.registerDisposer(blendMode.changed.add(this.redrawNeeded.dispatch));
    this.registerDisposer(shaderControlState.changed.add(this.redrawNeeded.dispatch));
  }

  defineShader(builder: ShaderBuilder, shaderParseResult: ShaderControlsParseResult) {
    if (shaderParseResult.errors.length !== 0) {
      throw new Error('Invalid UI control specification');
    }
    builder.addUniform('highp float', 'uOpacity');
    builder.addFragmentCode(`

#define VOLUME_RENDERING false

void emitRGBA(vec4 rgba) {
  emit(vec4(rgba.rgb, rgba.a * uOpacity));
}
void emitRGB(vec3 rgb) {
  emit(vec4(rgb, uOpacity));
}
void emitGrayscale(float value) {
  emit(vec4(value, value, value, uOpacity));
}
void emitTransparent() {
  emit(vec4(0.0, 0.0, 0.0, 0.0));
}
`);
    builder.addFragmentCode(glsl_COLORMAPS);
    addControlsToBuilder(shaderParseResult.controls, builder);
    builder.setFragmentMainFunction(shaderCodeWithLineDirective(shaderParseResult.code));
  }

  initializeShader(
      _sliceView: SliceView, shader: ShaderProgram, parameters: ShaderControlsParseResult) {
    const {gl} = this;
    gl.uniform1f(shader.uniform('uOpacity'), this.opacity.value);
    setControlsInShader(gl, shader, this.shaderControlState, parameters.controls);
  }

  setGLBlendMode(gl: WebGL2RenderingContext, renderLayerNum: number) {
    const blendModeValue = this.blendMode.value;
    if (blendModeValue === BLEND_MODES.ADDITIVE || renderLayerNum > 0) {
      gl.enable(gl.BLEND);
      BLEND_FUNCTIONS.get(blendModeValue)!(gl);
    }
  }
}
