"use strict";

angular.module('voteApp', [])
    .controller('VoteCtrl', ['$http', function ($http) {
        var vm = this;

        vm.vote = function (who) {
            $http.post('/vote', {
                who: who
            })
        };
    }]);