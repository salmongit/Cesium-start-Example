const ECesium = {
    version: '0.1',
    description: '自定义cesium组件',
    copyright: '2018-enbo'
};
 
ECesium.Tools = function (viewer, callback) {
    this.viewer = viewer;
    this.init();
};
 
ECesium.Tools.prototype.init = function (back) {
    //初始化事件
    const viewer = this.viewer;
    const scene = viewer.scene;
    this.drawingMode = null;
    this.measureMode = null;
    this.geodesic = new Cesium.EllipsoidGeodesic();
    this.handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
 
    this.dataSource = new Cesium.CustomDataSource('test1');
    viewer.dataSources.add(this.dataSource);
    console.log(viewer.dataSources.indexOf(this.dataSource));
};
 
ECesium.Tools.prototype.draw = function (type) {
    if (!this.viewer) return console.error('this.viewer 未定义');
    this.deactivate();
    this.drawingMode = type;
    switch (type) {
        case this.DRAW_TYPE.Point:
            this.DrawPoint();
            break;
        case this.DRAW_TYPE.PolyLine:
        case this.DRAW_TYPE.Polygon:
            this.DrawGraphics();
            break;
        default:
            break;
    }
};
 
ECesium.Tools.prototype.DrawPoint = function (callback) {
    const viewer = this.viewer;
    const this_ = this;
    this.drawingMode = "point";
    this.handler.setInputAction(function (evt) {
        const ray = viewer.camera.getPickRay(evt.position);
        const mapPosition = this_.getMapPoint(ray);
        if (!mapPosition) return;
        this_.dataSource.entities.add({
            id: '云台' + Math.random(),
            name: '林火监测点',
            position: Cesium.Cartesian3.fromDegrees(mapPosition.x, mapPosition.y, mapPosition.z),
            point: new Cesium.PointGraphics({
                color: Cesium.Color.SKYBLUE,
                pixelSize: 10,
                outlineColor: Cesium.Color.YELLOW,
                outlineWidth: 3,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }),
            description: `<img style="height: 200px;" src=${monitor}>`
        });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};
 
ECesium.Tools.prototype.DrawGraphics = function (callback) {
    const viewer = this.viewer;
    const this_ = this;
    let activeShapePoints = [];
    let activeShape, floatingPoint;
    this.handler.setInputAction(function (event) {
        if (!Cesium.Entity.supportsPolylinesOnTerrain(viewer.scene)) {
            return console.log('This browser does not support polylines on terrain.');
        }
        const ray = viewer.camera.getPickRay(event.position);
        const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
        if (Cesium.defined(earthPosition)) {
            if (activeShapePoints.length === 0) {
                floatingPoint = this_.createPoint(earthPosition);
                activeShapePoints.push(earthPosition);
                const dynamicPositions = new Cesium.CallbackProperty(function () {
                    return activeShapePoints;
                }, false);
                activeShape = this_.drawShape(dynamicPositions);
            }
 
            activeShapePoints.push(earthPosition);
            this_.createPoint(earthPosition);
        }
 
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
 
    this.handler.setInputAction(function (event) {
        if (Cesium.defined(floatingPoint)) {
            const ray = viewer.camera.getPickRay(event.endPosition);
            const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
            if (Cesium.defined(newPosition)) {
                floatingPoint.position.setValue(newPosition);
                activeShapePoints.pop();
                activeShapePoints.push(newPosition);
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 
    this.handler.setInputAction(function () {
        terminateShape();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
 
    function terminateShape() {
        activeShapePoints.pop();
        this_.drawShape(activeShapePoints);
        this.dataSource.entities.remove(floatingPoint);
        this.dataSource.entities.remove(activeShape);
        floatingPoint = undefined;
        activeShape = undefined;
        activeShapePoints = [];
    }
};
 
ECesium.Tools.prototype.getMapPoint = function (ray) {
    const viewer = this.viewer;
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (!cartesian) {
        return null;
    }
 
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const lng = Cesium.Math.toDegrees(cartographic.longitude);//经度值
    const lat = Cesium.Math.toDegrees(cartographic.latitude);//纬度值
    //cartographic.height的值为地形高度。
    return {x: lng, y: lat, z: cartographic.height};
};
 
ECesium.Tools.prototype.createPoint = function (worldPosition) {
    return this.dataSource.entities.add({
        position: worldPosition,
        point: {
            color: Cesium.Color.WHITE,
            pixelSize: 5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
    });
};
 
ECesium.Tools.prototype.drawShape = function (positionData) {
    switch (this.drawingMode) {
        case this.DRAW_TYPE.PolyLine:
            return this.dataSource.entities.add({
                polyline: {
                    positions: positionData,
                    clampToGround: true,
                    width: 3
                }
            });
        case this.DRAW_TYPE.Polygon:
            return this.dataSource.entities.add({
                polygon: {
                    hierarchy: positionData,
                    material: new Cesium.ColorMaterialProperty(Cesium.Color.WHITE.withAlpha(0.7))
                }
            });
        default:
            return;
    }
};
 
ECesium.Tools.prototype.measure = function (type) {
    this.deactivate();
    this.measureMode = type;
    this.DrawMeasureGraphics();
};
 
ECesium.Tools.prototype.DrawMeasureGraphics = function () {
    const viewer = this.viewer;
    const this_ = this;
    let activeShapePoints = [];
    let activeShape, floatingPoint;
    let measureDistance = 0, floatDistance = 0;
    this.handler.setInputAction(function (event) {
        if (!Cesium.Entity.supportsPolylinesOnTerrain(viewer.scene)) {
            return console.log('This browser does not support polylines on terrain.');
        }
        const ray = viewer.camera.getPickRay(event.position);
        const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
        if (Cesium.defined(earthPosition)) {
            if (activeShapePoints.length === 0) {
                floatingPoint = this_.createMeasurePoint(earthPosition);
                if (this_.measureMode === this_.MEASURE_TYPE.MEASURE_DISTANCE) {
                    floatingPoint.label = {
                        text: new Cesium.CallbackProperty(function (time) {
                            let distance = floatDistance = this_.getLatestLength(activeShapePoints);
                            return ((distance + measureDistance) / 1000).toFixed(2) + ' km';
                        }, false),
                        showBackground: true,
                        backgroundColor: new Cesium.Color(0, 0, 0, 0.5),
                        backgroundPadding: new Cesium.Cartesian2(7, 5),
                        font: '16px sans-serif',
                    };
 
                    this_.createLabel(earthPosition, '起点')
                }
                activeShapePoints.push(earthPosition);
                const dynamicPositions = new Cesium.CallbackProperty(function () {
                    return activeShapePoints;
                }, false);
                activeShape = this_.drawMeasureShape(dynamicPositions);
            }
 
            if (activeShapePoints.length > 1 && this_.measureMode === this_.MEASURE_TYPE.MEASURE_DISTANCE) {
                measureDistance += floatDistance;
                this_.createLabel(earthPosition, (measureDistance / 1000).toFixed(2) + ' km');
            }
 
            activeShapePoints.push(earthPosition);
            this_.createMeasurePoint(earthPosition);
        }
 
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
 
    this.handler.setInputAction(function (event) {
        if (Cesium.defined(floatingPoint)) {
            const ray = viewer.camera.getPickRay(event.endPosition);
            const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
            if (Cesium.defined(newPosition)) {
                floatingPoint.position.setValue(newPosition);
                activeShapePoints.pop();
                activeShapePoints.push(newPosition);
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 
    this.handler.setInputAction(function () {
        terminateShape();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
 
    function terminateShape() {
        activeShapePoints.pop();
        this_.drawMeasureShape(activeShapePoints);
        this_.dataSource.entities.remove(floatingPoint);
        this_.dataSource.entities.remove(activeShape);
        floatingPoint = undefined;
        activeShape = undefined;
        activeShapePoints = [];
        measureDistance = 0;
    }
};
 
ECesium.Tools.prototype.drawMeasureShape = function (positionData, callback) {
    console.log("draw shape");
    switch (this.measureMode) {
        case this.MEASURE_TYPE.MEASURE_DISTANCE:
            return this.dataSource.entities.add({
                polyline: {
                    positions: positionData,
                    clampToGround: true,
                    width: 3
                }
            });
        case this.MEASURE_TYPE.MEASURE_AREA:
            return this.dataSource.entities.add({
                polygon: {
                    hierarchy: positionData,
                    material: new Cesium.ColorMaterialProperty(Cesium.Color.WHITE.withAlpha(0.7))
                }
            });
        default:
            return;
    }
};
 
ECesium.Tools.prototype.getLatestLength = function (activeShapePoints) {
    const length = activeShapePoints.length;
    const endPoint = activeShapePoints[length - 1];
    const startPoint = activeShapePoints[length - 2];
    const startCartographic = Cesium.Cartographic.fromCartesian(startPoint);
    const endCartographic = Cesium.Cartographic.fromCartesian(endPoint);
    this.geodesic.setEndPoints(startCartographic, endCartographic);
    return Math.round(this.geodesic.surfaceDistance);
};
 
ECesium.Tools.prototype.createMeasurePoint = function (worldPosition, callback) {
    return this.dataSource.entities.add({
        position: worldPosition,
        point: {
            color: Cesium.Color.WHITE,
            pixelSize: 8,
            outlineColor: Cesium.Color.RED,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            scaleByDistance: new Cesium.NearFarScalar(0, 0, 1, 1)
        }
    });
};
 
ECesium.Tools.prototype.createLabel = function (worldPosition, text) {
    return this.dataSource.entities.add({
        position: worldPosition,
        label: {
            text: text,
            showBackground: true,
            backgroundColor: new Cesium.Color(1, 1, 1, 0.7),
            backgroundPadding: new Cesium.Cartesian2(7, 5),
            font: '16px sans-serif',
            fillColor: Cesium.Color.BLACK,
            outlineColor: Cesium.Color.BLACK,
            pixelOffset: new Cesium.Cartesian2(-15, -15)
        }
    });
};
 
ECesium.Tools.prototype.deactivate = function () {
    if (this.handler) {
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
 
    this.drawingMode = null;
};
 
ECesium.Tools.prototype.DRAW_TYPE = {
    Point: 'Point',
    PolyLine: 'PolyLine',
    Polygon: 'Polygon'
};
 
ECesium.Tools.prototype.MEASURE_TYPE = {
    MEASURE_DISTANCE: 'MeasureTerrainDistance',
    MEASURE_AREA: 'MeasureTerrainArea'
};