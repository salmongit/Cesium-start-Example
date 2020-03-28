/**
 * PrimitivePolyline
 * @nanme Sogrey
 * 
 * @version v1.0.0
 * @param {Cesium.Viewer} Cesium
 */
var PrimitivePolyline = (function (Cesium) {
    var _viewer, _scene, _canvas, _camera;
    var vertexShader, fragmentShader;

    var _config = { //默认配置
        isRadian: false, //是否是弧度制坐标，默认false角度制，true为弧度制
        positions: [], //3*n(经纬度高程 | 弧度制经纬度高程)
        colors: [], // 3*1(纯色) or 3*n(不透明渐变色) or 4*n(带透明的渐变色)
        isClosed: false, //是否闭合，默认不闭合
        isDash:false,//是否虚线，默认否实线，true虚线
    }

    function _(config) {        
        if (viewer == null) {
            throw "viewer 不能为空";
        }
        _viewer = viewer;
        _scene = _viewer.scene;
        _canvas = _viewer.canvas;
        _camera = _viewer.camera;

        vertexShader = getVS();
        fragmentShader = getFS();        
    }

    _.prototype.create = function (config) {
        setConfigs(config); //合并配置
        return createPrimitivePolyline(_config.positions, _config.colors);
    }

    function createPrimitivePolyline(positions, colors) {
        //顶点数大于等于两个
        if (positions && positions.length >= 3 && positions.length % 3 === 0) {
            var postionsTemp = [];
            var colorsTemp = [];
            var indicesTesm = [];

            //地理坐标转世界坐标 
            var postionsCartesian3TempArray =
                _config.isRadian ?
                Cesium.Cartesian3.fromRadiansArrayHeights(positions) :
                Cesium.Cartesian3.fromDegreesArrayHeights(positions);//3 => 1

            if (postionsCartesian3TempArray && postionsCartesian3TempArray.length > 0) {
                for (let i = 0; i < postionsCartesian3TempArray.length; i++) {
                    const position = postionsCartesian3TempArray[i];
                    postionsTemp.push(position.x, position.y, position.z);
                }
            }

            if (colors && colors.length === positions.length) { //RGB
                for (let i = 0; i < colors.length / 3; i += 3) {
                    colorsTemp.push(colors[3 * i], colors[3 * i + 1], colors[3 * i + 2], 1.0);
                }
            } else if (colors && colors.length * 3 === positions.length * 4) { //RGBA
                colorsTemp = colorsTemp.concat(colors);
            } else if (colors && colors.length === 3) { //仅一个颜色值RGB，纯色
                for (let i = 0; i < positions.length/3; i++) {
                    colorsTemp.push(colors[0], colors[1], colors[2], 1.0);
                }
            } else if (colors && colors.length === 4) { //仅一个颜色值RGBA，纯色
                for (let i = 0; i < positions.length/3; i++) {
                    colorsTemp.push(colors[0], colors[1], colors[2], colors[3]);
                }
            } else { //没有设置颜色，给默认颜色 蓝色
                for (let i = 0; i < positions.length/3; i++) {
                    colorsTemp.push(0.0, 0.0, 1.0, 1.0);
                }
            }

            for (var i = 1; i < postionsCartesian3TempArray.length; i++) {
                indicesTesm.push(i - 1, i);
            }

            //如果闭合
            if (_config.isClosed) {
                postionsTemp.push(postionsTemp[0], postionsTemp[1], postionsTemp[2]);
                colorsTemp.push(colorsTemp[0], colorsTemp[1], colorsTemp[2], colorsTemp[3]);

                indicesTesm.push(indicesTesm[indicesTesm.length - 1], 0);
            }

            var positionArr = new Float64Array(postionsTemp);
            var colorArr = new Float32Array(colorsTemp);
            var indiceArr = new Uint16Array(indicesTesm);

            var geometry = CreateGeometry(positionArr, colorArr, indiceArr);
            var appearance = CreateAppearence(fragmentShader, vertexShader);

            var primitive = _scene.primitives.add(new Cesium.Primitive({
                geometryInstances: new Cesium.GeometryInstance({
                    geometry: geometry
                }),
                appearance: appearance,
                asynchronous: false
            }));

            return primitive;
        } else {
            throw "请输入正确坐标";
        }
    }

    /**移除 */
    _.prototype.remove = function (primitive) {
        if (primitive != null) {
            _viewer.scene.primitives.remove(primitive);
        }
    }
    _.prototype.updateCartesianPosition = function (primitive,positions, colors) {
        if (primitive != null) {
            _viewer.scene.primitives.remove(primitive);

            return createPrimitivePolyline(positions, colors);
        }
    }

    /**
     * 更新粒子效果配置
     */
    function setConfigs(config) {
        for (var i = 0; i < arguments.length; i++) {
            var item = arguments[i];
            for (var o in item) {
                if (item.hasOwnProperty(o))
                    _config[o] = item[o];
            }
        }
    }
    /**
     * 创建几何体
     * @param {*} positions 
     * @param {*} colors 
     * @param {*} indices 
     */
    function CreateGeometry(positions, colors, indices) {
        return new Cesium.Geometry({
            attributes: {
                position: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.DOUBLE,
                    componentsPerAttribute: 3,
                    values: positions
                }),
                color: new Cesium.GeometryAttribute({
                    componentDatatype: Cesium.ComponentDatatype.FLOAT,
                    componentsPerAttribute: 4,
                    values: colors
                })
            },
            indices: indices,
            primitiveType: Cesium.PrimitiveType.LINES,
            boundingSphere: Cesium.BoundingSphere.fromVertices(positions)
        });
    }
    /**
     * 创建外观
     * @param {*} fs 
     * @param {*} vs 
     */
    function CreateAppearence(fs, vs) {
        return new Cesium.Appearance({
            renderState: {
                blending: Cesium.BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
                depthTest: {
                    enabled: true
                },
                depthMask: true,
                lineWidth: 1.0
            },
            fragmentShaderSource: fs,
            vertexShaderSource: vs
        });
    }
    //#region shaders
    function getVS() {
        return "attribute vec3 position3DHigh;\
attribute vec3 position3DLow;\
attribute vec4 color;\
varying vec4 v_color;\
attribute float batchId;\
void main()\
{\
    v_color =color;\
    vec4 p = czm_computePosition();\
    p = czm_modelViewProjectionRelativeToEye * p;\
    gl_Position = p;\
}";
    }

    function getFS() {
        return "varying vec4 v_color;\
void main()\
{\
    gl_FragColor =v_color;\
}";
    }
    //#endregion

    return _;
})(window.Cesium || {});