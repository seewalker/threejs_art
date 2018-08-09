"use strict";

// woah wait, random walk involving the vertices starting in a sphere.
// along with printing statistics. d3?
//
// COSMETIC
const sphere_faces = 16;
const sphere_color = 0xCC0000;
const fogColor = 0x000000;
const light_color = 0xFFFFFF;

//DYNAMICS
const rot = {'sphere': {'x' : 0.01, 'y' : 0, 'z' : 0},
             'dodec' : {'x' : 0.02, 'y' : 0, 'z' : 0},
             'cube':   {'x' : 0,    'y' : 0, 'z' : 0}};

//CAMERA
var cam_angle = 100;
const light_intensity = 2.0;
const camera_modes = ["free","sphere_surface","ellipse_surface","custom_surface"];
var camera_mode = "free";

//SIZES
var elem_w = window.innerWidth;
var elem_h = window.innerHeight;
var aspect = elem_w / elem_h;
const near = 0.1;
const far = 1000;
const cube_s = 100;
const d_free = {'translate' : 10, 'rotate' : 0.05};
const light_z = -250;
const z_offset = {'horiz' : -50,'vert' : -10,'cube' : -50};
const horiz_unit = 50;
const vert_unit = 50;
var sphere_r = horiz_unit;
var earth_r = vert_unit;
const horiz_spacing = 3 * horiz_unit;
const dodec_r = 50;
const vert_spacing = 3 * vert_unit;


// I should get the form stuff from basic so I can manipulate these in real time.
var motion_ts = ["direct","physical_force"];
var motion_t = "direct";
var walk_variance = 1.0;

// THREE.js fundamentals
var textureCube,cube_material,cube;
// this "scene" object has a lot of the magic of threejs.
var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
var cam = new THREE.PerspectiveCamera(cam_angle,aspect,near,far);

//                    Object Declarations.
var grp_horiz = new THREE.Group();
var grp_vert = new THREE.Group();
// CUBE
var geom_cube = new THREE.BoxGeometry(cube_s,cube_s,cube_s);
var loader = new THREE.CubeTextureLoader();
var gridHelper = new THREE.GridHelper(1000,100);
// HORIZ
var geom_c = new THREE.SphereGeometry(sphere_r,sphere_faces,sphere_faces);
var mat_basic = new THREE.MeshBasicMaterial({color : sphere_color});
var mat_lam = new THREE.MeshLambertMaterial({color : sphere_color,transparent: true,opacity:1.0});
var mat_phong = new THREE.MeshPhongMaterial({color : sphere_color});
var sphere_basic = new THREE.Mesh(geom_c,mat_basic);
var sphere_lam = new THREE.Mesh(geom_c,mat_lam);
var sphere_phong = new THREE.Mesh(geom_c,mat_phong);
var sphere_wireframe = new THREE.WireframeGeometry(geom_c);
var sphere_wirelines = new THREE.LineSegments(sphere_wireframe);
// VERT
var geom_dodec = new THREE.DodecahedronGeometry(dodec_r);
var dodec = new THREE.Mesh(geom_dodec,mat_phong);
var dodec_helper = new THREE.Mesh(dodec,5,0x00ff00,2);
var geom_knot = new THREE.TorusKnotGeometry(50,2,20,2);
var mat_knot = new THREE.MeshPhongMaterial({color : 0xff00ff});
var knot = new THREE.Mesh(geom_knot,mat_knot);
var earthTexture = new THREE.TextureLoader().load('images/earthmap.jpg');
var geom_earth = new THREE.SphereGeometry(earth_r,128,128);
var mat_earth = new THREE.MeshPhongMaterial({map : earthTexture});
var earthmesh = new THREE.Mesh(geom_earth,mat_earth);

// SPRITE
var spriteMap = new THREE.TextureLoader().load("images/alex_raw.png");
var sprite_mat = new THREE.SpriteMaterial({map : spriteMap, color : 0xffffff});
var sprite = new THREE.Sprite(sprite_mat);

// LIGHT
var pointLight = new THREE.PointLight(light_color,light_intensity);
var ambientLight = new THREE.AmbientLight(0x303030);

// I should have a randomly walking sprite which is not in a row or column.
//
//
// I should have vertexnormal helper on the dodecahedron.

function onkeypress (key_event) {
    console.log('onkeypress = ' + key_event.key);
    switch(key_event.key) {
        case "a":
            if (camera_mode == "free") { cam.rotation.x += d_free['rotate']; }
            break;
        case "d":
            if (camera_mode == "free") { cam.rotation.x -= d_free['rotate']; }
            break;
        case "q":
            if (camera_mode == "free") { cam.rotation.y += d_free['rotate']; }
            break;
        case "e":
            if (camera_mode == "free") { cam.rotation.y -= d_free['rotate']; }
            break;
        case "z":
            if (camera_mode == "free") { cam.rotation.z += d_free['rotate']; }
            break;
        case "c":
            if (camera_mode == "free") { cam.rotation.z -= d_free['rotate']; }
            break;
        case "f":
            if (camera_mode == "free") { cam.position.z -= d_free['translate']; }
            break;
        case "b":
            if (camera_mode == "free") { cam.position.z += d_free['translate']; }
            break;
    }
    switch (key_event.keyCode) {
        case 37: //left arrow
            if (camera_mode == "free") { cam.position.x -= d_free['translate']; }
            break;
        case 38: //up arrow
            if (camera_mode == "free") { cam.position.y += d_free['translate']; }
            break;
        case 39: //right arrow
            if (camera_mode == "free") { cam.position.x += d_free['translate']; }
            break;
        case 40: //down arrow
            if (camera_mode == "free") { cam.position.y -= d_free['translate']; }
            break;
    }
}

function setup_objects( ) {
    loader.setPath('textures/cube/npy/');
    textureCube = loader.load(['heat_sq.png','heatlog_sq.png','hist_sq.png','histflat_sq.png','plot_sq.png','scatter_sq.png']);
    cube_material = new THREE.MeshBasicMaterial({envMap : textureCube});
    cube = new THREE.Mesh(geom_cube,cube_material);
    scene.add(cube);

    // setup default grid
    // all the grids should be toggle-able.
    scene.add(gridHelper);
    // setup custom grids.
    // 1,-1 will be just like 0th grid, but done by me.
    // 2,-2 will be some kind of spline grid.

    // Connect to Scene
    grp_horiz.add(sphere_basic);
    grp_horiz.add(sphere_lam);
    grp_horiz.add(sphere_phong);
    grp_horiz.add(sphere_wirelines);
    grp_vert.add(dodec);
    grp_vert.add(earthmesh);
    grp_vert.add(knot);
    scene.add(grp_horiz);
    scene.add(grp_vert);

    // setting up sprite.
    sprite.scale.set(50,50,1);
    sprite.position.set(80,80,0);
    scene.add(sprite);

    //setting up extrusions.
    var exshape = new THREE.Shape();
    exshape.moveTo(0,0);
    exshape.lineTo(0,30);
    exshape.lineTo(40,30);
    exshape.lineTo(40,0);
    exshape.lineTo(0,0);
    // depth makes it go thicker.
    var exsettings = {
        steps: 2, depth: 100,
        bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 1
    };
    var exgeom = new THREE.ExtrudeGeometry(exshape,exsettings);
    var extexture = new THREE.TextureLoader().load('images/svelbard.jpg');
    var exapp = {
        map : extexture,
        color: 0x00ff00
    };
    var exmat = new THREE.MeshBasicMaterial(exapp);
    var exmesh = new THREE.Mesh(exgeom,exmat);

    scene.add(exmesh);

    // none of this vertex normal stuff is working...
    //dodec.geometry.computeVertexNormals();
    //scene.add(dodec_helper);
    // POSITIONING
    cube.position.x = 0;
    cube.position.z = light_z + z_offset['cube'];

    grp_horiz.position.z = light_z + z_offset['horiz'];
    grp_vert.position.z = light_z + z_offset['vert'];

    sphere_wirelines.position.x = -2 * horiz_spacing;
    sphere_basic.position.x = -1 * horiz_spacing;
    sphere_lam.position.x = 1 * horiz_spacing;
    sphere_phong.position.x = 2 * horiz_spacing;

    earthmesh.position.y = -1 * vert_spacing;
    dodec.position.y = 1 * vert_spacing;
    knot.position.y = 2 * vert_spacing;

    // COSMETIC
    sphere_wirelines.depthTest = false;
    sphere_wirelines.opacity = 0.75;
    sphere_wirelines.transparent = false;
}

function setup_light( ) {
    pointLight.position.x = 0;
    pointLight.position.y = 0;
    pointLight.position.z = light_z;
    scene.add(pointLight);
    scene.add(ambientLight);
}

function setup_fog( ) {
    var c = new THREE.Color(fogColor);
    scene.background = c;
    scene.fog = new THREE.FogExp2(c,0.0015);
}


function init() {
    // setup js stuff.
    document.body.appendChild(renderer.domElement);
    document.addEventListener("keydown",onkeypress,false);
    renderer.setSize(elem_w,elem_h);
    scene.add(cam);

    setup_light();
    setup_fog();
    setup_objects();
}

function update_objects() {
    // rotate the objects.
    var rot_t;
    var rotating_objs = [];
    var sphere_objs = [sphere_basic,sphere_lam,sphere_phong];
    var cube_objs = [cube];
    var dodec_objs = [dodec];
    var r;
    rotating_objs.concat(sphere_objs).concat(cube_objs).concat(dodec_objs);
    for (var xi of [sphere_basic,sphere_lam,sphere_phong,cube,dodec]) {
        if (sphere_objs.includes(xi)) { rot_t = 'sphere'; }
        else if (cube_objs.includes(xi)) { rot_t = 'cube'; }
        else if (dodec_objs.includes(xi)) { rot_t = 'dodec'; }
        r = rot[rot_t];
        xi.rotation.x += r['x'];
        xi.rotation.y += r['y'];
        xi.rotation.z += r['z'];
    }
    // move the sprite
    sprite.position.x += (Math.random() * 2 - 1) * walk_variance;
    sprite.position.y += (Math.random() * 2 - 1) * walk_variance;
    sprite.position.z += (Math.random() * 2 - 1) * walk_variance;

}

// time to move the light around.
var animate = function () {
    requestAnimationFrame(animate);
    update_objects();
    renderer.render(scene,cam);
};

init();
animate();
