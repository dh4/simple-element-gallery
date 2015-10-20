module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'src/vgallery.js'],
            options: {
                globals: {
                    jQuery: true
                },
            },
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint']
        },
        uglify: {
            options: {
                banner: '/**\n'+
                        ' * <%= pkg.name %> <%= pkg.version %>\n'+
                        ' * Copyright (c) 2015, Dan Hasting\n'+
                        ' * All rights reserved.\n'+
                        ' **/\n'
            },
            build: {
                src: 'src/vgallery.js',
                dest: 'build/vgallery-<%= pkg.version %>.min.js'
            },
        },
        copy: {
            main: {
                src: 'src/vgallery.js',
                dest: 'build/vgallery-<%= pkg.version %>.js',
            },
        },
        compress: {
            main: {
                options: {
                    archive: 'vGalleryjs-<%= pkg.version %>.zip'
                },
                files: [
                    {
                        flatten: true,
                        expand: true,
                        src: [
                            'src/vgallery-<%= pkg.version %>.js',
                            'build/vgallery-<%= pkg.version %>.min.js',
                            'LICENSE'
                        ],
                        dest: 'vGallery.js',
                    },
                ],
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.registerTask('default', ['jshint', 'uglify']);
    grunt.registerTask('package', ['copy:main', 'compress:main']);
};
