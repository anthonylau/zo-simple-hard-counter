"use strict";

angular.module('resultApp', ['nvd3'])
    .controller('ResultCtrl', ['$http', function($http) {
        var vm = this;

        vm.initialized = false;
        vm.candidates = [];

        vm.chartInitialized = false;
        // https://nvd3-community.github.io/nvd3/examples/documentation.html#lineChart
        vm.chartOptions = {
            chart: {
                type: 'lineChart',
                height: 450,
                margin : {
                    top: 20,
                    right: 20,
                    bottom: 100,
                    left: 55
                },
                x: function(d){
                    return new Date(d.at);
                },
                y: function(d){
                    return d.count;
                },
                useInteractiveGuideline: true,
                xAxis: {
                    axisLabel: 'Time',
                    tickFormat: function(d) {
                        // https://github.com/d3/d3-3.x-api-reference/blob/master/Time-Formatting.md
                        return d3.time.format('%c')(new Date(d))
                    },
                },
                yAxis: {
                    axisLabel: 'Vote Count',
                    tickFormat: function(d){
                        return d3.format('.02f')(d);
                    },
                    axisLabelDistance: -10
                },
            },
            title: {
                enable: true,
                text: 'Vote in last 10 minutes'
            },
        };
        vm.chartData = [];

        vm.init = function() {
            $http.get('/result').then(function(resp){
                vm.candidates = resp.data;
                vm.initialized = true;
            });

            $http.get('/stats').then(resp => {
                console.log(resp.data);
                vm.chartData = resp.data;
                vm.chartInitialized = true;
            });
        };
    }]);