/**
 * Token
 */
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzM2Y4NzFhMy1iMGMxLTQ3Y2EtOTRlMS0wMjc0YzU1ZGU2MTMiLCJpZCI6MTIwMDIsInNjb3BlcyI6WyJhc2wiLCJhc3IiLCJhc3ciLCJnYyJdLCJpYXQiOjE1ODI4NTkzNTl9.0gEg2Nw33lZCuSyR7cScyn2W91Zht1eWn0kxqGOtdxE';

var API = function (divId, options) {
    var viewer = null,
        scene = null,
        camera = null,
        globe = null;
    //默认配置
    defaultOption = {
        animation: false, //左下角控制动画            
        baseLayerPicker: false, //右上角图层选择器
        fullscreenButton: false, //右下角全屏按钮
        geocoder: false, //右上角搜索 
        sceneModePicker: false, //2d/3d切换     
        homeButton: false, //home键，点击回到默认视角
        infoBox: false, //点击模型不显示cesium自带的信息框        
        selectionIndicator: false, //点击模型不显示cesium自带的绿色选中框   
        // scene3DOnly:false,//仅仅显示3d,可隐藏右上角2d和3d按钮          
        timeline: false, //最下面时间轴            
        navigationHelpButton: false, //右上角帮助按钮 
        navigationInstructionsInitiallyVisibl: false,
        useDefaultRenderLoop: true,
        showRenderLoopErrors: true,
        projectionPicker: false, //投影选择器
        shouldAnimate: true,
        // terrainProvider: Cesium.createWorldTerrain(),//开启地形之后，地形有了海拔高度，之前没开地形是添加的车子陷入地下
    };
    this.option = EXT().merge(defaultOption, options);
    this.init = function () {
        //设置默认视角在中国
        var china = Cesium.Rectangle.fromDegrees(100, 10, 120, 70);
        Cesium.Camera.DEFAULT_VIEW_RECTANGLE = china;

        viewer = new Cesium.Viewer(divId, this.option);
        scene = viewer.scene;
        camera = viewer.camera;
        globe = scene.globe;

        window.viewer = viewer;
        window.scene = scene;
        window.camera = camera;
        window.globe = globe;

        this.viewer = viewer;
        this.scene = scene;
        this.camera = camera;
        this.globe = globe;

        viewer.extend(Cesium.viewerCesiumNavigationMixin, {}); //添加缩放控件-后面已设置失效
        // viewer._cesiumWidget.cesiumNavigation:CesiumNavigation

        viewer._cesiumWidget._creditContainer.parentNode.removeChild(viewer._cesiumWidget
            ._creditContainer); //去掉版权信息

        viewer.scene.preRender.addEventListener(function () {
            viewer.scene.camera._suspendTerrainAdjustment = false;
        });

        //关闭地形
        // viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider({});
        // scene.globe.show = false;//隐藏地球场景
        // scene.skyAtmosphere.show = false; //去掉地球外面白色环绕圈，关掉大气渲染
        // viewer.scene.globe.enableLighting = false; //关闭日光
        // viewer.shadows = false; //关闭阴影

        if (!scene.pickPositionSupported) {
            console.error('This browser does not support pickPosition.');
        }
    };
    this.init();

};

API.prototype = {
    Version: {
        getCesiumVersion: function () {
            return Cesium.VERSION;
        },
        getVersion: function () {
            return "1.0.0";
        }
    },
    Model: {
        AddModel: function () {}
    },
    Actor: {

    },
    Click: {

    },
    View: {

    },
    Label: {

    },
    Roaming: {

    },
    ParticleSystem: {

    },
    Other: {

    }
};




function EXT(options) {
    return new EXT.prototype.init(options);
}
EXT.fn = EXT.prototype = {
    type: function (o) {
        return Object.prototype.toString.call(o).slice(8, -1).toLowerCase();
    },
    typeMap: {
        object: function () {
            return {};
        },
        array: function () {
            return [];
        }
    },
    // 默认配置项
    defaults: {
        // 是否深合并
        isDeep: true,
        // 是否遍历合并源对象原型链上的属性
        includePrototype: true,
        // 用于对每个合并项进行自定义修正
        forEach: function (target, name, sourceItem) {
            target[name] = sourceItem;
            return target;
        }
    },
    // 将配置项合并到默认配置项
    init: function (options) {
        for (var name in options) {
            this.defaults[name] = options[name];
        }
        return this;
    },
    merge: function () {
        var self = this,
            _default = self.defaults,
            i = 1,
            length = arguments.length,
            target = arguments[0] || {},
            source,
            targetItem,
            sourceItem,
            tiType,
            siType,
            clone,
            name;

        for (; i < length; i++) {
            // 判断源对象是否为空
            if ((source = arguments[i]) != null) {
                for (name in source) {
                    // 是否遍历源对象的原型链
                    if (source.hasOwnProperty(name) || _default.includePrototype) {
                        targetItem = target[name];
                        sourceItem = source[name];
                        tiType = self.type(targetItem);
                        siType = self.type(sourceItem);

                        // 防止出现回环
                        if (target === sourceItem) {
                            continue;
                        }

                        // 如果复制的是对象或者数组
                        if (_default.isDeep && sourceItem != null && self.typeMap[siType]) {
                            clone = targetItem != null && tiType === siType ? targetItem : self.typeMap[siType]();
                            // 递归
                            target[name] = self.merge(clone, sourceItem);
                        } else {
                            // 处理每一个合并项
                            target = _default.forEach.call(self, target, name, sourceItem);
                        }
                    }
                }
            }
        }
        return target;
    }
};
EXT.fn.init.prototype = EXT.fn;