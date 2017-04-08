"use strict";

angular.module('simpleHardCounterApp', [])
    .controller('SimpleHardCounterCtrl', ['$http', function ($http) {
        var vm = this;

        vm.vote = function (who) {
            $http.post('/vote', {
                who: who
            })
        };
    }])
    .controller('ResultCtrl', ['$http', function($http) {
        var vm = this;

        vm.initialized = false;
        vm.candidates = [];

        vm.init = function() {
            console.log('init');
            $http.get('/result').then(function(resp){
                vm.candidates = resp.data;
                vm.initialized = true;
            });
        };
    }]);