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
angular.module('zeppelinWebApp').controller('ClusterCtrl', function($scope, $route, $routeParams, $location, $rootScope, $http, $timeout, $modal, $log, baseUrlSrv) {
  $scope.statusTimer = null;
  $scope.clusterSettings = null;
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
      user: setting.user,
      memory : setting.slaves,
      status : setting.status,
      master: master,
      storage: setting.storage,
      engine: setting.engine,
      type : setting.type,
      apps: apps,
      ui: ui
    };
  };

  var getStatusCluster = function() {
    var clusterSettings = [];
    var flag = 0;
    $http.get(baseUrlSrv.getRestApiBase()+'/cluster/status/').
    success(function(data, status, headers, config) {
      for (var settingId in data.body) {
        var setting = data.body[settingId];
        clusterSettings.push(remoteSettingToLocalSetting(setting));
        $scope.clusterSettings = clusterSettings;
        if ((setting.status === 'running') || (setting.status === 'failed')) {
          flag ++;
        }
      }
      if (flag === data.body.length) {
        $scope.killStatusTimer();
      } else {
        $scope.startStatusTimer();
      }
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.killStatusTimer = function() {
    if($scope.statusTimer){
      $timeout.cancel($scope.statusTimer);
      $scope.statusTimer = null;
    }
  };

  $scope.startStatusTimer = function() {
    console.log("dentro de startStatusTimer");
    $scope.killStatusTimer();
    $scope.statusTimer = $timeout(function(){
      getStatusCluster();
    }, 10000);
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
      //getClusterSettings();
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.addNewClusterSetting = function(type) {
    var name = '';
    var newSetting = {};
    //$scope.addNewClusterProperty();
    if(type === 'emr') {
      if (!$scope.newClusterSettingHadoop.name || !$scope.newClusterSettingHadoop.slaves) {
        alert('Please determine name and memory');
        return;
      }

      name = $scope.newClusterSettingHadoop.name;
      newSetting = {
        name : $scope.newClusterSettingHadoop.name,
        slaves : $scope.newClusterSettingHadoop.slaves,
        instance: $scope.instance,
        app: $scope.newClusterSettingHadoop.app
      };
    } else if(type === 'redshift') {
      if ($scope.newClusterSettingRedshift.passw !== $scope.newClusterSettingRedshift.confirm) {
        alert('Whoops, the passwords don\'t match');
        return;
      }
      name = $scope.newClusterSettingRedshift.name;
      newSetting = {
        name : $scope.newClusterSettingRedshift.name,
        slaves : $scope.newClusterSettingRedshift.nodes,
        user: $scope.newClusterSettingRedshift.user,
        passw: $scope.newClusterSettingRedshift.passw,
        instance : $scope.instance
      };
    } else {
      if ($scope.newClusterSettingRds.passw !== $scope.newClusterSettingRds.confirm) {
        alert('Whoops, the passwords don\'t match');
        return;
      }
      name = $scope.newClusterSettingRds.name;
      newSetting = {
        name : $scope.newClusterSettingRds.name,
        storage : $scope.newClusterSettingRds.storage,
        engine: $scope.newClusterSettingRds.engine,
        version: $scope.version,
        user: $scope.newClusterSettingRds.user,
        passw: $scope.newClusterSettingRds.passw,
        instance : $scope.instance
      };
    }
    $scope.showAddNewSetting = false;
    console.log($scope.version);

    $http.post(baseUrlSrv.getRestApiBase()+'/cluster/setting/' + type, newSetting).
    success(function(data, status, headers, config) {
      console.log('Success %o %o', status, data.message);
      reset();
      getStatusCluster();
      $scope.startStatusTimer();
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
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
  $scope.removeClusterSetting = function(setting) {
    var result = confirm('Do you want to delete this cluster?');
    if (!result) {
      return;
    }
    $http.delete(baseUrlSrv.getRestApiBase()+'/cluster/setting/'+setting.type+'/'+setting.id).
    success(function(data, status, headers, config) {
      getStatusCluster();
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

  var reset = function() {
    $scope.newClusterSettingRedshift = {};
    $scope.newClusterSettingHadoop = {};
  };

  $scope.loadInstances = function(engine) {
    console.log(engine);

    switch (engine) {
      case 'aurora':
        $scope.instanceType = ['db.r3.8xlarge', 'db.r3.4xlarge', 'db.r3.2xlarge', 'db.r3.xlarge','db.r3.large'];
        $scope.versionEngine = ['5.6.10a'];
        break;
      case 'mysql':
      $scope.versionEngine = ['5.5.40b', '5.5.41', '5.5.42', '5.6.19a', '5.6.19b', '5.6.21', '5.6.21b', '5.6.22', '5.6.23'];
        $scope.instanceType = ['db.t2.micro', 'db.t2.small', 'db.t2.medium', 'db.t2.large', 'db.m3.medium', 'db.m3.large', 'db.m3.xlarge', 'db.m3.2xlarge'];
        break;
      case 'postgres':
        $scope.versionEngine = ['9.3.3', '9.3.5', '9.3.6', '9.4.1'];
        $scope.instanceType = ['db.t2.micro', 'db.t2.small', 'db.t2.medium', 'db.t2.large', 'db.m3.medium', 'db.m3.large', 'db.m3.xlarge', 'db.m3.2xlarge'];
        break;
      case 'mariadb':
        $scope.versionEngine = ['10.0.17'];
        $scope.instanceType = ['db.t2.micro', 'db.t2.small', 'db.t2.medium', 'db.t2.large', 'db.m3.medium', 'db.m3.large', 'db.m3.xlarge', 'db.m3.2xlarge'];
        break;
    }
  };

  var init = function() {
    $rootScope.$emit('setLookAndFeel', 'default');
    $scope.clusterSettings = [];
    getStatusCluster();
    $scope.newClusterSettingRds = {
      engine: 'postgres'
    };
  };

  init();
});
