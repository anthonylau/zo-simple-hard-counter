"use strict";

angular.module('simpleHardCounterApp', [])
    .controller('SimpleHardCounterCtrl', ['$http', function ($http) {
        var vm = this;

        vm.vote = function (who) {
            $http.post('/vote', {
                who: who
            })
        };
    }]);