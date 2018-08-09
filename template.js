"use strict";

var chatty = true;
var do_sphere = true;
var do_plane = true;
// In basic.js, light is between sphere and camera.
const light_color = 0xFFFFFF;

//CAMERA
var cam_angle = 100;
const light_intensity = 2.0;
const cam_motion_modes = ["free","sphere_surface","ellipse_surface","custom_surface"];
var cam_motion_mode = "free";
var cam_t;

var scene = new THREE.Scene();
var canvas = document.getElementById("canvas_0");
var renderer = new THREE.WebGLRenderer({canvas : canvas});

//SIZES
var canvas_w = canvas.width;
var canvas_h = canvas.height;
var aspect = canvas_w / canvas_h;
const near = 0.1;
const far = 1000;
const cube_s = 50;
// the values here will come from the html form.
var d_free = {'translate' : undefined, 'rotate' : undefined};
const light_z = -10;
var screenshot_buffer = new THREE.WebGLRenderTarget(canvas_w,canvas_h,{minFilter : THREE.LinearFilter, magFilter: THREE.NearestFilter});

var cam = new THREE.PerspectiveCamera(cam_angle,aspect,near,far);
var cam_help = new THREE.CameraHelper(cam)
var cam_ortho = new THREE.OrthographicCamera(-1 * canvas_w/2,canvas_w/2,canvas_h/2,-1*canvas_h/2,near,far);
// LIGHT
var pointLight = new THREE.PointLight(light_color,light_intensity);
var ambientLight = new THREE.AmbientLight(0x303030);

const sphere_z = -50;
const sphere_faces = 16;
const sphere_color = 0xCC0000;
var sphere_r = 25;
var geom_c = new THREE.SphereGeometry(sphere_r,sphere_faces,sphere_faces);
var mat_lam = new THREE.MeshLambertMaterial({color : sphere_color});
var sphere = new THREE.Mesh(geom_c,mat_lam);

var click_count;
var click_history;
var rayCaster;
var plane_geom = new THREE.PlaneGeometry(500,500,1,1);
var plane_mat = new THREE.MeshBasicMaterial({color: 0xffff00,side : THREE.DoubleSide});
var plane = new THREE.Mesh(plane_geom,plane_mat);

function onkeypress (key_event) {
    if (chatty) { console.log('onkeypress = ' + key_event.key); }
    switch(key_event.key) {
        case "s":
            screenshot();
            break;
        case "a":
            if (cam_motion_mode == "free") { cam.rotation.x += d_free['rotate']; }
            break;
        case "d":
            if (cam_motion_mode == "free") { cam.rotation.x -= d_free['rotate']; }
            break;
        case "q":
            if (cam_motion_mode == "free") { cam.rotation.y += d_free['rotate']; }
            break;
        case "e":
            if (cam_motion_mode == "free") { cam.rotation.y -= d_free['rotate']; }
            break;
        case "z":
            if (cam_motion_mode == "free") { cam.rotation.z += d_free['rotate']; }
            break;
        case "c":
            if (cam_motion_mode == "free") { cam.rotation.z -= d_free['rotate']; }
            break;
        case "f":
            if (cam_motion_mode == "free") { cam.position.z -= d_free['translate']; }
            break;
        case "b":
            if (cam_motion_mode == "free") { cam.position.z += d_free['translate']; }
            break;
        case "r":
            if (cam_motion_mode == "free") {
                cam.position.set(0,0,0);
                cam.rotation.set(0,0,0);
            }
            break;
    } switch (key_event.keyCode) { case 37: //left arrow
            if (cam_motion_mode == "free") { cam.position.x -= d_free['translate']; }
            break;
        case 38: //up arrow
            if (cam_motion_mode == "free") { cam.position.y += d_free['translate']; }
            break;
        case 39: //right arrow
            if (cam_motion_mode == "free") { cam.position.x += d_free['translate']; }
            break;
        case 40: //down arrow
            if (cam_motion_mode == "free") { cam.position.y -= d_free['translate']; }
            break;
    }
    // synchronize the motions of the cameras.
    cam_ortho.position.x = cam.position.x;
    cam_ortho.position.y = cam.position.y;
    cam_ortho.position.z = cam.position.z;
}

function pix2three(v) {
    var x3 = (v[0] / canvas_w) * 2 - 1;
    var y3 = (v[1] / canvas_h) * 2 - 1;
    return [x3,y3];
}

function append_note(s) {
    var div = document.getElementById('graphics_notes');
    div.innerHTML += s;
}

function reset_options( ) {
    var new_opts = {
        'cam_motion_mode' : document.querySelector('input[name="nav_t"]:checked').value,
        'cam_t' : document.querySelector('input[name="cam_t"]:checked').value,
        'plane_z' : document.getElementById('ray_z').value,
        'd_free_r' : document.getElementById('d_free_r').value,
        'd_free_theta' : document.getElementById('d_free_theta').value,
    };
    // cam_motion_mode is a global variable.
    cam_motion_mode = new_opts['cam_motion_mode'];
    cam_t = new_opts['cam_t'];
    plane.position.z = new_opts['plane_z'];
    d_free['translate'] = parseFloat(new_opts['d_free_r']);
    d_free['rotate'] = parseFloat(new_opts['d_free_theta']);
    console.log('after reset, d_free is:');
    console.log(d_free);
    if (chatty) {
        console.log("new_opts is");
        console.log(new_opts);
    }
}

// this seems to sometimes be required to let the html file call reset_options successfully.
window.reset_options = reset_options;

function screenshot( ) {
    renderer.render(scene,cam,screenshot_buffer);
}

function move_sphere(x,y) {
    var threecoord = pix2three([x,y]);
    var pos = new THREE.Vector2(threecoord[0],threecoord[1]);
    rayCaster.setFromCamera(pos,cam);
    var origin = rayCaster.ray.origin;
    var direction = rayCaster.ray.direction;
    var intersection,intersect_x,intersect_y,intersect_z;
    var intersections = rayCaster.intersectObject(plane);
    if (intersections.length != 1) {
        console.log("Warning, intersection was not found");
    }
    else {
        //sphere.position.set(intersect_x,intersect_y,intersect_z);
        console.log("clickray intersects plane at");
        intersection = intersections[0];
        console.log(intersection);
        intersect_x = intersection.point.x;
        intersect_y = intersection.point.y;
        intersect_z = intersection.point.z;
        sphere.position.set(intersect_x,-1 * intersect_y,intersect_z);
    }
    if (chatty) {
        console.log(["x=" + x + ", y=" + y]);
        console.log(["origin=" + origin.toArray() + ", direction=" + direction.toArray()]);
    }
}

function onclick(ev) {
    var x = ev.offsetX;
    var y = ev.offsetY;
    move_sphere(x,y);
    click_history.push([x,y]);
    click_count += 1;
}

function setup_objects( ) {
    sphere.position.set(0,0,sphere_z);
    if (do_sphere) {
        scene.add(sphere);
    }
    reset_options( );
    scene.add(plane);
}

function setup_light( ) {
    pointLight.position.x = 0;
    pointLight.position.y = 0;
    pointLight.position.z = light_z;
    scene.add(cam_help);
    scene.add(pointLight);
    scene.add(ambientLight);
}

function init() {
    // setup js stuff.
    document.body.appendChild(renderer.domElement);
    document.addEventListener("keydown",onkeypress,false);
    // ignore clicks not on canvas.
    canvas.addEventListener("click",onclick);
    renderer.setSize(canvas_w,canvas_h);
    scene.add(cam);
    click_history = [];
    click_count = 0;
    rayCaster = new THREE.Raycaster();

    setup_light();
    setup_objects();
    append_note("A basic starting point having : camera at (0,0,0) looking down negative z axis, ambient and camera-directional point light, a sphere (unless do_sphere=false), camera motion.");
}

function update_data_display( ) {
    const precision = 2;
    var cam_pos_div = document.getElementById('camera_pos');
    var cam_dir_div = document.getElementById('camera_direction');
    var cam_x = cam.position.x.toFixed(precision),cam_y = cam.position.y.toFixed(precision),cam_z = cam.position.z.toFixed(precision);
    var dir = cam.getWorldDirection();
    var dir_x = dir.x.toFixed(precision),dir_y = dir.y.toFixed(precision),dir_z = dir.z.toFixed(precision);

    cam_pos_div.innerHTML = `Camera Position (x,y,z) = (${cam_x},${cam_y},${cam_z})`;
    cam_dir_div.innerHTML = `Camera Direction vector = (${dir_x},${dir_y},${dir_z})`;
}

// time to move the light around.
var animate = function () {
    requestAnimationFrame(animate);
    if (cam_t == "perspective") {
        renderer.render(scene,cam);
    }
    else if (cam_t == "orthographic") {
        renderer.render(scene,cam_ortho);
    }
    else {
        alert("uncaught unknown camera type: " + cam_t);
    }
    update_data_display( );
};

window.onload = function() {
    init();
    animate();
}
