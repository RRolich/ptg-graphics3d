// ссылка на блок веб-страницы, в котором будет отображаться графика
var container;
// переменные: камера, сцена и отрисовщик
var camera, scene, renderer;
var geometry;
// var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();
//  размер поверхности: 
var N = 255;
// глобальная переменная отображения курсора
var cursor3D;
// глобальная переменная окружности вокруг курсора
var circle;
// глобальная переменная размера радиуса окружности вокруг курсора
var radius = 10;
//
var brushDirection = 0;
//переменная для хранения координат мыши 
var mouse = { x: 0, y: 0 };
//массив для объектов, проверяемых на пересечение с курсором
var targetList = [];
//массив для объектов, проверяемых на добавление в сцену
var objectsList = [];
//объект интерфейса и его ширина
var gui = new dat.GUI();
gui.width = 200;
// глобальные переменные для хранения списка анимаций
var mixer = new THREE.AnimationMixer(scene);
var morphs = [];
// видимость курсора
var brVis = false;
var s;
var lmb = false;
// массив прдзагруженных изображений
var models = new Map(); //{}
// ссылка на выбранный объект для перемещения
var selected = null;

// глобальная переменная для хранения карты высот
// var imagedata;
// функция инициализации камеры, отрисовщика, объектов сцены и т.д.
init();
// обновление данных по таймеру браузера
animate();

// в этой функции можно добавлять объекты и выполнять их первичную настройку
function init() {
    // получение ссылки на блок html-страницы
    container = document.getElementById('container');
    // создание сцены
    scene = new THREE.Scene();

    // установка параметров камеры
    // 45 - угол обзора
    // window.innerWidth / window.innerHeight - соотношение сторон
    // 1 и 4000 - ближняя и дальняя плоскости отсечения
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);

    // установка позиции камеры
    // camera.position.set(5, 5, 5);
    // camera.position.set(0, 1.5, 0); 
    camera.position.set(N / 2, N / 2, N * 1.5); // N*2
    // camera.position.set(N / 2, N * 2, N * 1.5);
    // camera.position.set(N / 1.5, N * 2, N * 1.5);

    // установка точки, на которую камера будет смотреть
    // camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.lookAt(new THREE.Vector3(N / 2, 0.0, N / 2));

    // создание отрисовщика
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth - 30, window.innerHeight - 30);
    // закрашивание экрана синим цветом, заданным в шестнадцатеричной системе
    // argb - colors - красный, например будет 0x00ff0000
    renderer.setClearColor(0x596C86, 1);
    // renderer.setClearColor(0x444444, 1); // серый фон

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // добавление обработчика события изменения размеров окна
    window.addEventListener('resize', onWindowResize, false);

    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);
    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    renderer.domElement.addEventListener('wheel', onDocumentMouseScroll, false);
    // блокировщик открытия меню правой кнопки мыши:  
    renderer.domElement.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    });

    // Добавление источника освещения
    addLights();
    // Добавление фона неба
    // addSphere(N * 2, "texture/skydome.jpg");
    addSphere(N * 2, "models/skyEmpty.jpg");
    // пользовательская функция генерации ландшафта
    addTerrainTextureHeigh();
    add3DCursor();
    addCircle();
    // вызов функции окна пользовательского управления
    GUI();

    loadModel("models/", "Tree.obj", "Tree.mtl", 0.2, "tree");
    loadModel("models/", "Cyprys_House.obj", "Cyprys_House.mtl", 2, 'house');
    loadModel("models/bench/", "Bench_LowRes.obj", "Bench_LowRes.mtl", 0.06, "bench");

    loadAnimatedModel("models/Parrot.glb");
}

function addSphere(r, tname) {
    // создание геометрии для сферы	
    var geoSphere = new THREE.SphereGeometry(r, 32, 32);
    // загрузка текстуры
    var tex = new THREE.TextureLoader().load(tname);
    tex.minFilter = THREE.NearestFilter;
    // создание материала
    var material = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide
    });
    // создание объекта
    var sphere = new THREE.Mesh(geoSphere, material);
    sphere.material.depthWrite = false;
    // размещение объекта в сцене
    scene.add(sphere);
}

function addTerrainTextureHeigh() {

    // cоздание структуры для хранения вершин
    geometry = new THREE.Geometry();

    for (var i = 0; i < N; i++)
        for (var j = 0; j < N; j++) {
            // добавление координат вершин в массив вершин x y z
            geometry.vertices.push(new THREE.Vector3(i, 0.0, j)); // вершина с индексом 0
        }

    for (var i = 0; i < N - 1; i++)
        for (var j = 0; j < N - 1; j++) {
            // добавление индексов (порядок соединения вершин) в массив индексов
            var a = i + j * N;
            var b = (i + 1) + j * N;
            var c = (i + 1) + (j + 1) * N;
            var d = i + (j + 1) * N;
            geometry.faces.push(new THREE.Face3(a, b, c));
            geometry.faces.push(new THREE.Face3(a, c, d));

            geometry.faceVertexUvs[0].push([
                new THREE.Vector2((i) / (N - 1), j / (N - 1)),
                new THREE.Vector2((i + 1) / (N - 1), j / (N - 1)),
                new THREE.Vector2((i + 1) / (N - 1), (j + 1) / (N - 1))
            ]);

            geometry.faceVertexUvs[0].push([
                new THREE.Vector2((i + 1) / (N - 1), j / (N - 1)),
                new THREE.Vector2((i + 1) / (N - 1), (j + 1) / (N - 1)),
                new THREE.Vector2((i) / (N - 1), (j + 1) / (N - 1))
            ]);
        }

    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    // создание загрузчика текстур
    var loader = new THREE.TextureLoader();
    // загрузка текстуры grasstile.jpg из папки pics
    var tex = loader.load('models/grasstile.jpg');
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);

    // //Загрузка текстуры
    // var tex = new THREE.ImageUtils.loadTexture('models/grasstile.jpg');
    // tex.minFilter = THREE.NearestFilter;
    // tex.wrapS = tex.wrapT = THREE.RepeatWrapping; 
    // tex.repeat.set( 4, 4 );

    var mat = new THREE.MeshLambertMaterial({
        map: tex, // источник цвета - текстура
        // wireframe: false,
        side: THREE.DoubleSide
    });

    // создание объекта и установка его в определённую позицию
    var triangleMesh = new THREE.Mesh(geometry, mat);
    triangleMesh.position.set(0.0, 0.0, 0.0);

    // triangleMesh.castShadow = false;
    triangleMesh.receiveShadow = true;

    // triangleMesh.receiveShadow = true;

    targetList.push(triangleMesh);

    // добавление объекта в сцену     
    scene.add(triangleMesh);
}

function onWindowResize() {
    // изменение соотношения сторон для виртуальной камеры
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // изменение соотношения сторон рендера
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// в этой функции можно изменять параметры объектов и обрабатывать действия пользователя
function animate() {
    var delta = clock.getDelta();

    if (brushDirection != 0) {
        sphereBrush(brushDirection, delta);
    }

    if (morphs.length > 0) {
        // обновление анимации 
        mixer.update(delta);
        // // движение по сцене:
        // for (var i = 0; i < morphs.length; i++) {
        //     // пока анимация над террейн
        //     if (morphs[i].position.x != N) {
        //         morphs[i].position.x += 0.5;
        //         morphs[i].position.z += 0.5;
        //     } else {
        //         morphs[i].position.x = 0;
        //         morphs[i].position.z = 0;
        //     }
        // }
    }

    // добавление функции на вызов при перерисовке браузером страницы 
    requestAnimationFrame(animate);
    render();
}

function render() {
    // рисование кадра
    renderer.render(scene, camera);
    // тени
    // renderer.shadowMap.enabled = true;
}

function loadModel(path, objName, mtlName, s, name) {
    // функция, выполняемая в процессе загрузки модели (выводит процент загрузки)
    var onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };
    // функция, выполняющая обработку ошибок, возникших в процессе загрузки
    var onError = function (xhr) { };

    var mtlLoader = new THREE.MTLLoader();
    //mtlloader.setBaseUrl(path);
    mtlLoader.setPath(path);

    // функция загрузки материала
    mtlLoader.load(mtlName, function (materials) {
        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(path);

        // функция загрузки модели
        objLoader.load(objName, function (object) {
            // triangleMesh.castShadow = true;
            // triangleMesh.receiveShadow = true;



            // for (var i = 0; i < 100; i++)
            // {
            //     var x = Math.random() * N;
            //     var z = Math.random() * N;
            //     var y = geometry.vertices[Math.round(z) + Math.round(x) * N].y;
            //     object.position.x = x;
            //     object.position.y = y;
            //     object.position.z = z;
            //     var s = (Math.random() * 100) + 30;
            //     s /= 400.0;
            //     object.scale.set(s, s, s);
            //     // object.scale.set(0.2, 0.2, 0.2);
            // }
            object.name = name;
            object.parent = object;

            var x = Math.random() * N;
            var z = Math.random() * N;
            var y = geometry.vertices[Math.round(z) + Math.round(x) * N].y;
            object.position.x = x;
            object.position.y = y;
            object.position.z = z;
            // var s = (Math.random() * 100) + 30;
            // s /= 400.0;
            object.scale.set(s, s, s);
            // // object.scale.set(0.2, 0.2, 0.2);

            object.castShadow = true;
            object.receiveShadow = false;
            console.log(object);

            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.parent = object;
                }
            });
            // object.position.x = 0;
            // object.position.y = 0;
            // object.position.z = 0;
            // object.scale.set(2, 2, 2); // размер модели
            // object.scale.set(0.2, 0.2, 0.2);

            models.set(name, object);
            // models.push(object);
            // scene.add(object);
        }, onProgress, onError);
    });
}

function loadAnimatedModel(path) {
    var loader = new THREE.GLTFLoader();
    loader.load(path, function (gltf) {
        var mesh = gltf.scene.children[0];
        var clip = gltf.animations[0];

        // установка параметров анимации (скорость воспроизведения и стартовый кадр)
        mixer.clipAction(clip, mesh).setDuration(1).startAt(0).play();

        mesh.position.set(0, 30, 0);
        mesh.rotation.y = Math.PI / 8;
        mesh.scale.set(0.2, 0.2, 0.2);

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.add(mesh);
        morphs.push(mesh);
    });
}


function add3DCursor() {
    //параметры цилиндра: диаметр вершины, диаметр основания, высота, число сегментов
    var geometry = new THREE.CylinderGeometry(1.5, 0, 5, 64);
    var cyMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    cursor3D = new THREE.Mesh(geometry, cyMaterial);
    cursor3D.visible = false;
    scene.add(cursor3D);
}

function addCircle() {
    var material = new THREE.LineBasicMaterial({ color: 0xffff00 });
    var segments = 64;
    var circleGeometry = new THREE.CircleGeometry(1, segments);
    //удаление центральной вершины
    circleGeometry.vertices.shift();

    // разворот окружности вокруг курсора на поверхность: 
    for (var i = 0; i < circleGeometry.vertices.length; i++) {
        circleGeometry.vertices[i].z = circleGeometry.vertices[i].y;
        circleGeometry.vertices[i].y = 0;
    }

    circle = new THREE.Line(circleGeometry, material);
    // circle.rotation.x = Math.PI/2; // встанет дугой

    circle.scale.set(radius, 1, radius); // radius : 1
    circle.visible = false;
    scene.add(circle);
}

function onDocumentMouseScroll(event) {
    if (brVis == true) {
        if (radius > 1)
            if (event.wheelDelta < 0) {
                radius--;
            }
        if (radius < N / 3)
            if (event.wheelDelta > 0) {
                radius++;
            }
        circle.scale.set(radius, 1, radius);
    }
}

function onDocumentMouseMove(event) {
    //определение позиции мыши
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    //создание луча, исходящего из позиции камеры и проходящего сквозь позицию курсора мыши
    var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
    vector.unproject(camera);

    var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
    // создание массива для хранения объектов, с которыми пересечётся луч
    var intersects = ray.intersectObjects(targetList);
    if (brVis == true) {
        // если луч пересёк какой-либо объект из списка targetList
        if (intersects.length > 0) {
            //печать списка полей объекта
            // console.log(intersects[0]);
            if (cursor3D != null) {
                cursor3D.position.copy(intersects[0].point);
                cursor3D.position.y += 2.5;
            }
            if (circle != null) {
                circle.position.copy(intersects[0].point);
                circle.position.y = 0;

                for (var i = 0; i < circle.geometry.vertices.length; i++) {
                    //получение позиции в локальной системе координат
                    var pos = new THREE.Vector3();
                    pos.copy(circle.geometry.vertices[i]);
                    //нахождение позиции в глобальной системе координат 
                    pos.applyMatrix4(circle.matrixWorld);

                    var x = Math.round(pos.x);
                    var z = Math.round(pos.z);
                    if (x >= 0 && x < N && z >= 0 && z < N) {
                        var y = geometry.vertices[z + x * N].y;
                        circle.geometry.vertices[i].y = y + 0.03; // 0.01 
                    } else {
                        circle.geometry.vertices[i].y = 0;
                    }
                }
                circle.geometry.verticesNeedUpdate = true; //обновление вершин 
            }
        }
    }
    else {
        if (intersects.length > 0) {
            if (selected != null && lmb == true) {
                selected.position.copy(intersects[0].point);
                selected.userData.box.setFromObject(selected);
                //получение позиции центра объекта
                var pos = new THREE.Vector3();
                selected.userData.box.getCenter(pos);
                //получение позиции центра объекта
                selected.userData.obb.position.copy(pos);
                selected.userData.cube.position.copy(pos);

                for (var i = 0; i < objectsList.length; i++) {
                    if (selected.userData.cube != objectsList[i]) {
                        objectsList[i].material.visible = false;
                        objectsList[i].material.color = { r: 0, g: 1, b: 0 };
                        if (intersect(selected.userData, objectsList[i].userData.model.userData) == true) {
                            objectsList[i].material.color = { r: 1, g: 1, b: 0 };
                            objectsList[i].material.visible = true;
                        }
                    }
                }
            }
        }
    }
}

function onDocumentMouseDown(event) {
    if (brVis === true) {
        console.log(event.which);
        if (event.which == 1)
            brushDirection = 1;
        if (event.which == 3)
            brushDirection = -1;
    } else {
        lmb = true;
        //определение позиции мыши
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        //создание луча, исходящего из позиции камеры и проходящего сквозь позицию курсора мыши
        var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
        vector.unproject(camera);

        var ray = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

        // создание массива для хранения объектов, с которыми пересечётся луч
        var intersects = ray.intersectObjects(objectsList, true);
        if (intersects.length > 0) {
            if (selected != null) {
                selected.userData.cube.material.visible = false;
                // selected = intersects[0].object.parent;
                selected = intersects[0].object.userData.model;
                console.log(selected);
                //отмена скрытия коробки
                selected.userData.cube.material.visible = true;
            } else {
                selected = intersects[0].object.userData.model;
                //скрытие коробки
                selected.userData.cube.material.visible = true;
            }
        } else {
            if (selected != null) {
                selected.userData.cube.material.visible = false;
                selected = null;
            }
        }
    }
}

function onDocumentMouseUp(event) {
    if (brVis === true) {
        brushDirection = 0;
    } else {
        lmb = false;
    }
}

function sphereBrush(dir, delta) {
    for (var i = 0; i < geometry.vertices.length; i++) {
        var x2 = geometry.vertices[i].x;
        var z2 = geometry.vertices[i].z;
        var r = radius;
        var x1 = cursor3D.position.x;
        var z1 = cursor3D.position.z;
        var h = r * r - (((x2 - x1) * (x2 - x1)) + ((z2 - z1) * (z2 - z1)));
        if (h > 0) {
            geometry.vertices[i].y += Math.sqrt(h) * delta * dir;
            // geometry.vertices[i].y += Math.sin(h) * delta * dir; // другой вид кисти 
        }
    }
    geometry.computeFaceNormals();
    geometry.computeVertexNormals(); //пересчёт нормалей 
    geometry.verticesNeedUpdate = true; //обновление вершин 
    geometry.normalsNeedUpdate = true; //обновление нормалей
}

function GUI() {
    //массив переменных, ассоциированных с интерфейсом
    var params =
    {
        volume: 0, rotate: 0, sz: 0,
        brush: false,
        addHouse: function () { addMesh('house') },
        addPalm: function () { addMesh('tree') },
        addGrade: function () { addMesh('bench') },
        del: function () { delMesh() }
    };
    //создание вкладки
    var folder1 = gui.addFolder('Scale');
    //ассоциирование переменных отвечающих за масштабирование
    //в окне интерфейса они будут представлены в виде слайдера
    //минимальное значение - 1, максимальное – 100, шаг – 1
    //listen означает, что изменение переменных будет отслеживаться
    var meshSX = folder1.add(params, 'volume').min(1).max(500).step(1).listen();
    var meshSY = folder1.add(params, 'rotate').min(0).max(360).step(1).listen();
    //var meshSZ = folder1.add(params, 'sz').min(1).max(100).step(1).listen();
    //при запуске программы папка будет открыта
    folder1.open();
    //описание действий совершаемых при изменении ассоциированных значений
    meshSX.onChange(function (value) {
        if (selected != null) {
            if (selected.name != 'house') {
                var s1 = value / 100;
                selected.scale.set(s1, s1, s1);
                // console.log(selected.scale);
            } else {
                var s1 = value / 10;
                selected.scale.set(s1, s1, s1);
                // console.log(selected.scale);
            }
            selected.userData.cube.scale.set(value, value, value);
        }
    });
    meshSY.onChange(function (value) {
        if (selected != null) {
            // selected.update();
            selected.rotation.y = value * Math.PI / 180;
            // selected.box.center(selected.userData.obb.position);
            selected.userData.cube.rotation.y = value * Math.PI / 180;
            //обновление матрицы поворота объекта/OBB модели
            selected.userData.obb.basis.extractRotation(selected.userData.cube.matrixWorld);
        }
    });
    // meshSZ.onChange(function(value) {...});

    //добавление чек бокса с именем brush
    var cubeVisible = gui.add(params, 'brush').name('brush').listen();

    cubeVisible.onChange(function (value) {
        // value принимает значения true и false
        brVis = value;
        cursor3D.visible = value;
        circle.visible = value;
    });

    //добавление кнопок, при нажатии которых будут вызываться функции addMesh
    //и delMesh соответственно. Функции описываются самостоятельно.
    gui.add(params, 'addHouse').name("add house");
    gui.add(params, 'addPalm').name("add tree");
    gui.add(params, 'addGrade').name("add bench");
    gui.add(params, 'del').name("delete");
    //при запуске программы интерфейс будет раскрыт
    gui.open();
}

function addMesh(name) {
    // scene.add(models.get(name).clone());
    console.log(models.get(name));
    var model = models.get(name).clone();

    // создание коробки вокруг объекта
    var box = new THREE.Box3();
    box.setFromObject(model);
    model.userData.box = box;

    // построение видимой геометрии коробки
    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    var cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    //скрытие объекта
    cube.material.visible = false;

    //получение позиции центра объекта
    var pos = new THREE.Vector3();
    box.getCenter(pos);
    //получение размеров объекта
    var size = new THREE.Vector3();
    box.getSize(size);

    //установка позиции и размера объекта в куб
    cube.position.copy(pos);
    cube.scale.set(size.x, size.y, size.z);

    model.userData.cube = cube;
    cube.userData.model = model;

    var obb = {};
    //структура состоит из матрицы поворота, позиции и половины размера
    obb.basis = new THREE.Matrix4();
    obb.halfSize = new THREE.Vector3();
    obb.position = new THREE.Vector3();
    //получение позиции центра объекта
    box.getCenter(obb.position);
    //получение размеров объекта
    box.getSize(obb.halfSize).multiplyScalar(0.5);
    //получение матрицы поворота объекта 
    obb.basis.extractRotation(model.matrixWorld);
    // //структура хранится в поле userData объекта
    // object.userData.obb = obb;

    model.userData.obb = obb;

    objectsList.push(cube);
    // objectsList.push(model);
    console.log(objectsList);
    scene.add(model);
}

function delMesh() {
    // поиск индекса элемента picked в массиве models
    // var index = selected.userData;
    // если такой индекс существует, удаляем один элемент из массива
    if (selected.userData != null) {
        // scene.remove(selected.userData.model);
        scene.remove(selected.userData.cube);
        scene.remove(selected);
    }
    // удаление из сцены объекта, на который ссылается picked

    //render();
}

function addLights() {
    var ambient = new THREE.AmbientLight(0x333333);
    scene.add(ambient);

    // var light = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 2);
    // //позиция источника освещения
    // light.position.set(N, 100, N);
    // //направление освещения
    // light.target.position.set(N / 2, 0, N / 2);
    // //включение расчёта теней
    // light.castShadow = true;
    // //параметры области расчёта теней
    // light.shadow.camera.near = 100;
    // light.shadow.camera.far = 1000;
    // light.shadow.camera.fov = 90;
    // light.shadow.bias = 0.0001;
    // //размер карты теней
    // light.shadow.mapSize.width = 2048;
    // light.shadow.mapSize.height = 1024;

    var light = new THREE.SpotLight(0xffffff);
    light.position.set(100, 1000, 100);

    light.castShadow = true;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    light.shadow.camera.near = 500;
    light.shadow.camera.far = 4000;
    light.shadow.camera.fov = 30;

    // // создание точечного источника освещения заданного цвета
    // var spotlight = new THREE.PointLight(0xffffff);
    // // установка позиции источника освещения
    // spotlight.position.set(N * 1.5, N * 1.5, N * 2.0);
    // spotlight.castShadow = true;
    // spotlight.shadow = new THREE.spotLightShadow(new THREE.PerspectiveCamera(60, 1, 10, 1000));
    // spotlight.shadow.bias = 0.0001;
    // spotlight.shadow.mapSize.width = 4096;
    // spotlight.shadow.mapSize.height = 4096;
    // // добавление источника в сцену
    // scene.add(spotlight);

    // // создание точечного источника освещения заданного цвета
    // var spotlight = new THREE.PointLight(0xffffff);
    // // установка позиции источника освещения
    // spotlight.position.set(N * 1.5, N * 1.5, N * 2.0);
    // spotlight.castShadow = true;
    // spotlight.shadow = new THREE.spotLightShadow(new THREE.PerspectiveCamera(60, 1, 10, 1000));
    // spotlight.shadow.bias = 0.0001;
    // spotlight.shadow.mapSize.width = 4096;
    // spotlight.shadow.mapSize.height = 4096;
    // // добавление источника в сцену
    // scene.add(spotlight);

    // var light = new THREE.DirectionalLighth(0xffffff);
    // light.position.set(N, N, N / 2);
    // light.target = new THREE.Object3D();
    // light.target.position.set(N / 2, 0, N / 2);
    // scene.add(light.traget);

    // light.castShadow = true;
    // light.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(60, 1, 10, 1000));
    // light.shadow.bias = 0.0001;
    // light.shadow.mapSize.width = 4096;
    // light.shadow.mapSize.height = 4096;
    // scene.add(light);

    scene.add(light);
}

//оригинал алгоритма и реализацию класса OBB можно найти по ссылке: 
//https://github.com/Mugen87/yume/blob/master/src/javascript/engine/etc/OBB.js 
function intersect(ob1, ob2) {
    var xAxisA = new THREE.Vector3();
    var yAxisA = new THREE.Vector3();
    var zAxisA = new THREE.Vector3();
    var xAxisB = new THREE.Vector3();
    var yAxisB = new THREE.Vector3();
    var zAxisB = new THREE.Vector3();
    var translation = new THREE.Vector3();
    var vector = new THREE.Vector3();
    var axisA = [];
    var axisB = [];
    var rotationMatrix = [[], [], []];
    var rotationMatrixAbs = [[], [], []];
    var _EPSILON = 1e-3;
    var halfSizeA, halfSizeB;
    var t, i;
    ob1.obb.basis.extractBasis(xAxisA, yAxisA, zAxisA);
    ob2.obb.basis.extractBasis(xAxisB, yAxisB, zAxisB);
    // push basis vectors into arrays, so you can access them via indices
    axisA.push(xAxisA, yAxisA, zAxisA);
    axisB.push(xAxisB, yAxisB, zAxisB);
    // get displacement vector
    vector.subVectors(ob2.obb.position, ob1.obb.position);
    // express the translation vector in the coordinate frame of the current 
    // OBB (this)
    for (i = 0; i < 3; i++) {
        translation.setComponent(i, vector.dot(axisA[i]));
    }
    // generate a rotation matrix that transforms from world space to the 
    // OBB's coordinate space
    for (i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            rotationMatrix[i][j] = axisA[i].dot(axisB[j]);
            rotationMatrixAbs[i][j] = Math.abs(rotationMatrix[i][j]) + _EPSILON;
        }
    }

    // test the three major axes of this OBB
    for (i = 0; i < 3; i++) {
        vector.set(rotationMatrixAbs[i][0], rotationMatrixAbs[i][1], rotationMatrixAbs[i][2]);
        halfSizeA = ob1.obb.halfSize.getComponent(i); halfSizeB = ob2.obb.halfSize.dot(vector);
        if (Math.abs(translation.getComponent(i)) > halfSizeA + halfSizeB) {
            return false;
        }
    }

    // test the three major axes of other OBB
    for (i = 0; i < 3; i++) {
        vector.set(rotationMatrixAbs[0][i], rotationMatrixAbs[1][i], rotationMatrixAbs[2][i]);
        halfSizeA = ob1.obb.halfSize.dot(vector); halfSizeB = ob2.obb.halfSize.getComponent(i);
        vector.set(rotationMatrix[0][i], rotationMatrix[1][i], rotationMatrix[2][i]);
        t = translation.dot(vector);
        if (Math.abs(t) > halfSizeA + halfSizeB) {
            return false;
        }
    }

    // test the 9 different cross-axes
    // A.x <cross> B.x
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[2][0] + ob1.obb.halfSize.z * rotationMatrixAbs[1][0];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[0][2] + ob2.obb.halfSize.z * rotationMatrixAbs[0][1];
    t = translation.z * rotationMatrix[1][0] - translation.y * rotationMatrix[2][0];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // A.x < cross> B.y
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[2][1] + ob1.obb.halfSize.z * rotationMatrixAbs[1][1];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[0][2] + ob2.obb.halfSize.z * rotationMatrixAbs[0][0];
    t = translation.z * rotationMatrix[1][1] - translation.y * rotationMatrix[2][1];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // A.x <cross> B.z
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[2][2] + ob1.obb.halfSize.z * rotationMatrixAbs[1][2];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[0][1] + ob2.obb.halfSize.y * rotationMatrixAbs[0][0];
    t = translation.z * rotationMatrix[1][2] - translation.y * rotationMatrix[2][2];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // A.y <cross> B.x
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[2][0] + ob1.obb.halfSize.z * rotationMatrixAbs[0][0];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[1][2] + ob2.obb.halfSize.z * rotationMatrixAbs[1][1];
    t = translation.x * rotationMatrix[2][0] - translation.z * rotationMatrix[0][0];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // A.y <cross> B.y
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[2][1] + ob1.obb.halfSize.z * rotationMatrixAbs[0][1];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[1][2] + ob2.obb.halfSize.z * rotationMatrixAbs[1][0];
    t = translation.x * rotationMatrix[2][1] - translation.z * rotationMatrix[0][1];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // A.y <cross> B.z
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[2][2] + ob1.obb.halfSize.z * rotationMatrixAbs[0][2];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[1][1] + ob2.obb.halfSize.y * rotationMatrixAbs[1][0];
    t = translation.x * rotationMatrix[2][2] - translation.z * rotationMatrix[0][2];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // A.z <cross> B.x
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[1][0] + ob1.obb.halfSize.y * rotationMatrixAbs[0][0];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[2][2] + ob2.obb.halfSize.z * rotationMatrixAbs[2][1];
    t = translation.y * rotationMatrix[0][0] - translation.x * rotationMatrix[1][0];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // A.z <cross> B.y
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[1][1] + ob1.obb.halfSize.y * rotationMatrixAbs[0][1];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[2][2] + ob2.obb.halfSize.z * rotationMatrixAbs[2][0];
    t = translation.y * rotationMatrix[0][1] - translation.x * rotationMatrix[1][1];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // A.z <cross> B.z
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[1][2] + ob1.obb.halfSize.y * rotationMatrixAbs[0][2];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[2][1] + ob2.obb.halfSize.y * rotationMatrixAbs[2][0];
    t = translation.y * rotationMatrix[0][2] - translation.x * rotationMatrix[1][2];
    if (Math.abs(t) > halfSizeA + halfSizeB) {
        return false;
    }

    // no separating axis exists, so the two OBB don't intersect
    return true;
}