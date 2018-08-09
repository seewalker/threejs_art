"use strict";

var PD = require('probability-distributions');
var chatty = true;
var do_sphere = false;
var do_plane = false;
var even_mesh,rand_mesh;
var even_mesh_an,rand_mesh_an;
// In basic.js, light is between sphere and camera.
const light_color = 0xFFFFFF;

//CAMERA
var cam_angle = 100;
const light_intensity = 2.0;
const camera_modes = ["free","sphere_surface","ellipse_surface","custom_surface"];
var camera_mode = "free";
var cam_t;

var scene = new THREE.Scene();
var canvas = document.getElementById("canvas_0");
var renderer = new THREE.WebGLRenderer({canvas : canvas});

var sphere_mat = new THREE.MeshLambertMaterial({color : 0xffff00, transparent: true, opacity:0.3});
const sphere_unit = 10;
var sphere_geom = new THREE.SphereGeometry(sphere_unit,64,64);

//SIZES
var canvas_w = canvas.width;
var canvas_h = canvas.height;
var aspect = canvas_w / canvas_h;
const near = 0.1;
const far = 1000;
const cube_s = 50;
const d_free = {'translate' : 2, 'rotate' : 0.05};
const light_z = -10;

var concentric_variance;

const cam_motion_modes = ["free","sphere_surface","ellipse_surface","custom_surface"];
var cam_motion_mode = "free";
var cam = new THREE.PerspectiveCamera(cam_angle,aspect,near,far);
var cam_help = new THREE.CameraHelper(cam)
var cam_ortho = new THREE.PerspectiveCamera(-1 * canvas_w/2,canvas_w/2,canvas_h/2,-1*canvas_h/2,near,far);

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
window.plane = plane;

var global_matrices = {};


// today: get signatures working, letting further variants be stubs for now, get annotations working.
//
function onkeypress (key_event) {
    if (chatty) { console.log('onkeypress = ' + key_event.key); }
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
        case "r":
            if (camera_mode == "free") {
                cam.position.set(0,0,0);
                cam.rotation.set(0,0,0);
            }
            break;
    } switch (key_event.keyCode) { case 37: //left arrow
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
        'variance' : document.getElementById('variance').value,
        'delta_color' : document.getElementById('delta_color').value
    };
    // cam_motion_mode is a global variable.
    cam_motion_mode = new_opts['cam_motion_mode'];
    cam_t = new_opts['cam_t'];
    plane.position.z = new_opts['plane_z'];
    d_free['translate'] = parseFloat(new_opts['d_free_r']);
    d_free['rotate'] = parseFloat(new_opts['d_free_theta']);
    concentric_variance = parseFloat(new_opts['variance']);
    delta_color = parseFloat(new_opts['delta_color']);
    console.log('after reset, d_free is:');
    console.log(d_free);
    if (chatty) {
        console.log("new_opts is");
        console.log(new_opts);
    }
}

window.reset_options = reset_options;

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

function sphere_solve(x,y,r_sq) {
    return r_sq - x*x - y*y;
}

function mk3(x,y,z) {
    return new THREE.Vector3(x,y,z);
}

function flatten_vec3(xs) {
    var flat = new Float32Array(xs.length * 3);
    for (var i=0;i<xs.length;++i) {
        flat[i*3] = xs[i].x;
        flat[(i*3)+1] = xs[i].y;
        flat[(i*3)+2] = xs[i].z;
    }
    return flat
}

// randomly samples points
function sphere_points_rand(c,n) {
    const r = 5;
    const r_sq = r*r;
    var z,theta,x,y,i,v;
    var coords = [];
    let zs = PD.runif(n,-r,r);
    for(i=0;i<n;++i) {
        z = zs[i];
        theta = PD.runif(1,0,2 * Math.PI);
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        v = new THREE.Vector3(x,y,z);
        v.add(c);
        coords.push(v);
    }
    return coords;
}

// let n be a perfect square
function sphere_points_even(c,n) {
    // keep r constant, keep theta constant, vary phi from 0 to 180.
    const r = 5;
    var sqrtn = Math.sqrt(n);
    var i=0,j=0,di=(2 * Math.PI / sqrtn),dj=(Math.PI / sqrtn);
    var theta,phi,sintheta;
    var coords = [],x,y,z,v;
    for(i=0;i<sqrtn;++i) {
        theta = i * di;
        sintheta = Math.sin(theta);
        for(j=0;j<sqrtn;++j) {
            phi = j * dj
            x = r * sintheta * Math.cos(phi)
            y = r * sintheta * Math.sin(phi)
            z = r * Math.cos(theta)
            v = new THREE.Vector3(x,y,z);
            v.add(c);
            coords.push(c);
        }
    }
    return coords;
}

function concentric_indices(n) {
    //0,1,0,2...0,n+1
    var indices = new Uint16Array(2*n);
    for (var i=0; i<n ;++i) {
        indices[2*i] = 0;
        indices[(2*i)+1] = (i+1);
    }
    return indices;
}

function init_colors(n,color_0) {
    var colors = new Float32Array(n*3);
    for (var i = 0; i < n; ++i) {
        colors[3*i] = color_0[0];
        colors[3*i+1] = color_0[1];
        colors[3*i+2] = color_0[2];
    }
    return colors;
}

function init_global_matrix(n,name) {
    var global_matrix;
    global_matrix = new Array(n);
    for (var i = 0; i < n; ++i) {
        global_matrix[i] = new Float32Array(n);
    }
    global_matrices[name] = global_matrix;
}

// line endpoints vary.
function concentric_lines(c,n,appearance,placement_t,name) {
    // 0 to n-1.
    var vec3_coords;
    init_global_matrix(n,name);
    if (placement_t == "rand") {
        vec3_coords = sphere_points_rand(c,n);
    }
    else if (placement_t == "even") {
        vec3_coords = sphere_points_even(c,n);
    }
    else {
        console.log('err');
    }
    // prepend center, now 0 to n.
    vec3_coords.unshift(c);
    var coords = flatten_vec3(vec3_coords);
    var indices = concentric_indices(n);
    // there is probably some BufferGeometry alternative with custom indexing ability to avoid duplicating all the
    // pushes of "c".
    if (chatty) {
        console.log("coords=");
        console.log(coords);
        console.log("indices=");
        console.log(indices);
    }
    var geom = new THREE.BufferGeometry();
    geom.addAttribute('position',new THREE.BufferAttribute(coords,3));
    geom.addAttribute('color',new THREE.BufferAttribute(init_colors(n,[0,0,0]),3));
    // crossing is kept track of per dimension.
    geom.addAttribute('n_crossing',new THREE.BufferAttribute(new Float32Array(n),3));
    console.log("added attribute");
    geom.setIndex(new THREE.BufferAttribute(indices,1));
    // can this "geom" be changed later via the mesh? it does need to randomly walk afterall.
    var mat = new THREE.LineBasicMaterial(appearance);
    var mesh = new THREE.LineSegments(geom,mat);
    scene.add(mesh);
    return mesh;
}

// make a mesh with the actual average radius.
// some visualization of the variance.
function annotate_randlines(mesh,c) {
    var s = new THREE.Mesh(sphere_geom,sphere_mat);
    s.position.set(c);
    scene.add(s);
    return s;
}

function update_annotations(annotation_mesh,object_mesh) {
    var i,j;
    var c = new THREE.Vector3(0,0,0);
    var variance = new THREE.Vector3(0,0,0);
    var vs = object_mesh.geometry.attributes.position;
    let n = (vs.length / 3) - 1
    var vx,vy,vz;
    // the annotation center.
    for (i=0;i<n;++i) {
        c.x += vs[3*(i+1)];
        c.y += vs[3*(i+1)+1];
        c.z += vs[3*(i+1)+2];
    }
    c.divideScalar(n);
    // the annotation variance.
    for (i=0;i<n;++i) {
        vx = vs[3*(i+1)] - c.x;
        vy = vs[3*(i+1) + 1] - c.y;
        vz = vs[3*(i+1) + 2] - c.z;
        variance.x += vx*vx;
        variance.y += vy*vy;
        variance.z += vz*vz;
    }
    // variance 1 : scale 1.
    variance.divideScalar(n);
    // so the sphere deforms a little bit along dimensions.
    annotation_mesh.scale.set(variance.x,variance.y,variance.z);
    annotation_mesh.position.set(c);
}

function surface_init( ) {

}

// 
function surface_update() {

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
    scene.add(sphere);
    sphere.visible = do_sphere;
    if (do_sphere) {
        sphere.visible = true
    }
    else {
        sphere.visible = false;
    }
    reset_options( );
    scene.add(plane);
    plane.visible = do_plane;
    var centers = [mk3(0,0,-10),mk3(10,0,-10)];
    rand_mesh = concentric_lines(centers[0],256,{color : 0xff0000},'rand',"standard");
    rand_mesh_an = annotate_randlines(rand_mesh,centers[0]);
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

function get_crossings(c,p0,pf) {
    var crossing = [0,0,0];
    crossing[0] = Math.sign(p0[0]-c[0]) != Math.sign(pf[0]-c[0])
    crossing[1] = Math.sign(p0[1]-c[1]) != Math.sign(pf[1]-c[1])
    crossing[2] = Math.sign(p0[2]-c[2]) != Math.sign(pf[2]-c[2])
    return crossing;
}

function l2(x0,y0,z0,x1,x2,x3) {
    var xd = (x0-x1)
    var yd = (y0-y1)
    var zd = (z0-z1)
    return xd*xd + yd*yd + zd*zd;
}
// how to implement all-nearest neighbor?
// distance matrix. min values for each row.
// returns indexes for 

function distance_matrix(vs,name) {
    var n = (vs.length/3)-1;
    var x0,y0,z0,x1,y1,z1;
    // should be a reference. fetch it all at once in case interpreter won't do so.
    var mat = global_matrices[name]['distance'];
    for (var i = 0; i < n; ++i) {
        x0 = vs[3*i];
        y0 = vs[3*i+1];
        z0 = vs[3*i+2];
        for (var j = (i+1); j < n; ++j) {
            x1 =  vs[3*j];
            x2 =  vs[3*j+1];
            x2 =  vs[3*j+2];
            mat[i][j] = l2(x0,y0,z0,x1,x2,x3);
        }
    }

}

function nearest_neighbor_solve(vs,k,name) {
    var nearest;
    for (var i = 0; i < n; ++i) {
        nearest.push(new Float32Array( ));
        for (var j = (i+1); j < n; ++j) {
            if (mat[i][j] < nearest[i][k-1]) {
                nearest[i][k-1] = mat[i][j];
                arg_nearest[i][k-1] = j;
                // need to use the order-permutation node function here.
            }
        }
    }
}

function update_random_points(mesh,variance,distribution_t) {
    // this binding to vs does work because it's essentially a pointer that will change the buffer by reference.
    var vs = mesh.geometry.attributes.position.array
    let n_vertices = (vs.length/3)-1;
    let cx = vs[0],cy = vs[1], cz = vs[2]
    var dx,dy,dz;
    var xi,yi,zi,x_next,y_next,z_next;
    var scale,crossings;
    var rs;
    var baseline = PD.rnorm(n_vertices,1,variance);
    if (distribution_t == "i.i.d") {
        // mean of 1 because it is multiplicative. rs is a scalar for the delta.
        rs = baseline;
    }
    else if (distribution_t == "nearest_neighbor_covar") {
        // if all neighbors equidist, behave like rnorm centered at 1.
        // if differing from neighbor average, behave like rnorm cenetered at (1+(mean-v))
        
    }
    else if (distribution_t == "nearest_neigbhor_potential") {

    }
    else if (distribution_t == " ") {

    }
    else { //assume i.i.d
        rs = PD.rnorm(n_vertices,1,variance)
    }
    for(var i=0;i<n_vertices;++i) {
        // compute and scale difference vectors.
        xi = vs[3 * (i+1)];
        yi = vs[3 * (i+1) + 1];
        zi = vs[3 * (i+1) + 2];
        dx = (xi - cx) * rs[i];
        dy = (yi - cy) * rs[i];
        dz = (zi - cz) * rs[i];
        // update crossing and color info.
        x_next = cx + dx;
        y_next = cy + dy;
        z_next = cz + dz;
        crossings = get_crossings([cx,cy,cz],[xi,yi,zi],[x_next,y_next,z_next]);
        mesh.geometry.attributes.n_crossing[3*i] += crossings[0]
        mesh.geometry.attributes.n_crossing[3*i+1] += crossings[1]
        mesh.geometry.attributes.n_crossing[3*i+2] += crossings[2]
        mesh.geometry.attributes.color[3*i] = mesh.geometry.attributes.n_crossing[3*i] * delta_color;
        mesh.geometry.attributes.color[3*i+1] = mesh.geometry.attributes.n_crossing[3*i+1] * delta_color;
        mesh.geometry.attributes.color[3*i+2] = mesh.geometry.attributes.n_crossing[3*i+2] * delta_color;
        // update vertices.
        vs[3 * (i+1)] = x_next;
        vs[3 * (i+1) + 1] = y_next;
        vs[3 * (i+1) + 2] = z_next;
    }
    mesh.geometry.attributes.position.needsUpdate = true
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
    update_random_points(rand_mesh,concentric_variance);
    update_annotations(rand_mesh_an,rand_mesh);
    //update_random_points(even_mesh,concentric_variance);
    update_data_display( );
};

window.onload = function() {
    init();
    animate();
}
