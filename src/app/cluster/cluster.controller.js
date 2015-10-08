  /* global confirm:false, alert:false */
/* jshint loopfunc: true */
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @ngdoc function
 * @name zeppelinWebApp.controller:ClusterCtrl
 * @description
 * # ClusterCtrl
 * Controller of cluster, manage the note (update)
 */
angular.module('zeppelinWebApp').controller('ClusterCtrl', function($scope, $route, $routeParams, $location, $rootScope, $http, $interval, $modal, $log, baseUrlSrv) {
  var remoteSettingToLocalSetting = function(setting) {
    var ui = [];
    var apps = [];
    var master;
    for (var key in setting.urls) {
      if(key !== 'dns') {
        ui.push({
          'tag': key,
          'url': setting.urls[key]
        });
      } else {
        master = setting.urls[key];
      }
    }

    for (var key in setting.apps) {
      if (setting.apps[key]) {
        apps.push({
          'app': key
        });
      }
    }

    return {
      id : setting.id,
      name : setting.name,
      memory : setting.slaves,
      status : setting.status,
      master: master,
      type : setting.type,
      apps: apps,
      ui: ui
    };
  };

  var getClusterSettings = function() {
    $http.get(baseUrlSrv.getRestApiBase()+'/cluster/setting').
      success(function(data, status, headers, config) {
        var clusterSettings = [];

        for (var settingId in data.body) {
          var setting = data.body[settingId];
          console.log(setting);
          clusterSettings.push(remoteSettingToLocalSetting(setting));
          if ((setting.status === 'starting') || (setting.status === 'bootstrapping') || (setting.status === 'running') || (setting.status === 'terminating')) {
            getStatusCluster(setting.id);
          }
        }
        $scope.clusterSettings = clusterSettings;

      }).
      error(function(data, status, headers, config) {
        console.log('Error %o %o', status, data.message);
      });
  };

  $scope.updateClusterSetting = function(settingId) {
    var result = confirm('Do you want to update this cluster and restart with new memory?');
    if (!result) {
      return;
    }

    $scope.addNewClusterProperty(settingId);

    var request;
    var name = '';

    for (var i=0; i < $scope.clusterSettings.length; i++) {
      var setting = $scope.clusterSettings[i];
      if(setting.id === settingId) {
        request = setting.memory;
        $scope.clusterSettings[i].memory = setting.memory;
        name = setting.name;
        break;
      }
    }
    $http.put(baseUrlSrv.getRestApiBase()+'/cluster/setting/'+settingId, request).
    success(function(data, status, headers, config) {
      getClusterSettings();
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.addNewClusterSetting = function(type) {
    $scope.showAddNewSetting = false;
    var name = '';
    var newSetting = {};
    //$scope.addNewClusterProperty();
    if(type === 'emr') {
      if (!$scope.newClusterSettingHadoop.name || !$scope.newClusterSettingHadoop.slaves) {
        alert('Please determine name and memory');
        return;
      }
      name = $scope.newClusterSettingHadoop.name;
      var instance = 'm3.xlarge'
      if ($scope.instance == 1) {
        type = 'm3.8xlarge'
      }
      newSetting = {
        name : $scope.newClusterSettingHadoop.name,
        slaves : $scope.newClusterSettingHadoop.slaves,
        instance: instance,
        app: $scope.newClusterSettingHadoop.app
      };
    } else {
      if (!$scope.newClusterSettingRedshift.name || !$scope.newClusterSettingRedshift.nodes) {
        alert('Please determine name and memory');
        return;
      }
      name = $scope.newClusterSettingRedshift.name;
      var instance = 'ds2.xlarge'
      if ($scope.instance == 1) {
        type = 'ds2.8xlarge'
      }
      newSetting = {
        name : $scope.newClusterSettingRedshift.name,
        slaves : $scope.newClusterSettingRedshift.nodes,
        user: $scope.newClusterSettingRedshift.user,
        passw: $scope.newClusterSettingRedshift.passw,
        instance : instance
      };
    }
    $http.post(baseUrlSrv.getRestApiBase()+'/cluster/setting/' + type, newSetting).
      success(function(data, status, headers, config) {
        console.log('Success %o %o', status, data.message);
        getClusterSettings();
      }).
      error(function(data, status, headers, config) {
        console.log('Error %o %o', status, data.message);
      });
  };

  var getStatusCluster = function(clusterId) {
      console.log(clusterId);
      var interval = $interval(function(){
        $http.get(baseUrlSrv.getRestApiBase()+'/cluster/status/' + clusterId).
          success(function(data, status, headers, config) {
            console.log(data.message);
            if ((data.message === 'waiting') || (data.message === 'success') || (data.message === 'available') || (data.message === 'terminated')) {
              $interval.cancel(interval);
              getClusterSettings();
            }
          }).
          error(function(data, status, headers, config) {
            console.log('Error %o %o', status, data.message);
          });
      }, 6000);
    };

  $scope.addNewClusterProperty = function(settingId) {
    if(settingId === undefined) {
      if (!$scope.newClusterSetting.propertyKey || $scope.newClusterSetting.propertyKey === '') {
        return;
      }
      $scope.newClusterSetting.properties[$scope.newClusterSetting.propertyKey] = { value : $scope.newClusterSetting.propertyValue};
      $scope.newClusterSetting.propertyValue = '';
      $scope.newClusterSetting.propertyKey = '';
    }
    else {
      for (var i=0; i < $scope.clusterSettings.length; i++) {
        var setting = $scope.clusterSettings[i];
        if (setting.id === settingId){
          if (!setting.propertyKey || setting.propertyKey === '') {
            return;
          }
          setting.properties[setting.propertyKey] = { value : setting.propertyValue };
          setting.propertyValue = '';
          setting.propertyKey = '';
          break;
        }
      }
    }
  };
  $scope.removeClusterSetting = function(settingId) {
    var result = confirm('Do you want to delete this cluster?');
    if (!result) {
      return;
    }
    $http.delete(baseUrlSrv.getRestApiBase()+'/cluster/setting/'+settingId).
      success(function(data, status, headers, config) {
        for (var i=0; i < $scope.clusterSettings.length; i++) {
          var setting = $scope.clusterSettings[i];
          if (setting.id === settingId) {
            getStatusCluster(settingId);
          }
        }
      }).
      error(function(data, status, headers, config) {
        console.log('Error %o %o', status, data.message);
      });
  };

  $scope.appToHadoop = function() {
    $scope.newClusterSettingHadoop.app = {
      spark: false,
      hive:true,
      hue:false
    };
  };

  var init = function() {
    $rootScope.$emit('setLookAndFeel', 'default');
    $scope.clusterSettings = [];
    $scope.availableClusters = {};
    getClusterSettings();
  };

  init();
});
