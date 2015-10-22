/* global confirm:false, alert:false, _:false */
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

angular.module('zeppelinWebApp').controller('InterpreterCtrl', function($scope, $route, $routeParams, $location, $rootScope,
                                                                         $http, baseUrlSrv) {
  var interpreterSettingsTmp = [];
  $scope.interpreterSettings = [];
  $scope.availableInterpreters = {};
  $scope.showAddNewSetting = false;

  var getInterpreterSettings = function() {
    $http.get(baseUrlSrv.getRestApiBase()+'/interpreter/setting').
    success(function(data, status, headers, config) {
      $scope.interpreterSettings = data.body;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  var getAvailableInterpreters = function() {
    $http.get(baseUrlSrv.getRestApiBase()+'/interpreter').
    success(function(data, status, headers, config) {
      $scope.availableInterpreters = data.body;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  var emptyNewProperty = function(object) {
    angular.extend(object, {propertyValue: '', propertyKey: ''});
  };

  var removeTMPSettings = function(index) {
    interpreterSettingsTmp.splice(index, 1);
  };

  $scope.copyOriginInterpreterSettingProperties = function(settingId) {
    var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
    interpreterSettingsTmp[index] = angular.copy($scope.interpreterSettings[index]);
  };

  $scope.updateInterpreterSetting = function(settingId) {
    var result = confirm('Do you want to update this interpreter and restart with new settings?');
    if (!result) {
      return;
    }

    var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });

    var request = {
      properties : angular.copy($scope.interpreterSettings[index].properties),
    };


    $http.put(baseUrlSrv.getRestApiBase() + '/interpreter/setting/' + settingId, request).
    success(function(data, status, headers, config) {
      $scope.interpreterSettings[index] = data.body;
      removeTMPSettings(index);
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.resetInterpreterSetting = function(settingId){
    var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });

    // Set the old settings back
    $scope.interpreterSettings[index] = angular.copy(interpreterSettingsTmp[index]);
    removeTMPSettings(index);
  };

  $scope.removeInterpreterSetting = function(settingId) {
    var result = confirm('Do you want to delete this interpreter setting?');
    if (!result) {
      return;
    }

    $http.delete(baseUrlSrv.getRestApiBase() + '/interpreter/setting/' + settingId).
    success(function(data, status, headers, config) {

      var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
      $scope.interpreterSettings.splice(index, 1);
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.newInterpreterGroupChange = function() {
    var el = _.pluck(_.filter($scope.availableInterpreters, { 'group': $scope.newInterpreterSetting.group }), 'properties');

    var properties = {};
    for (var i=0; i < el.length; i++) {
      var intpInfo = el[i];
      for (var key in intpInfo) {
        properties[key] = {
          value : intpInfo[key].defaultValue,
          description : intpInfo[key].description
        };
      }
    }

    $scope.newInterpreterSetting.properties = properties;
  };

  $scope.restartInterpreterSetting = function(settingId) {
    var result = confirm('Do you want to restart this interpreter?');
    if (!result) {
      return;
    }

    $http.put(baseUrlSrv.getRestApiBase() + '/interpreter/setting/restart/' + settingId).
    success(function(data, status, headers, config) {
      var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
      $scope.interpreterSettings[index] = data.body;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.addNewInterpreterSetting = function() {
    if (!$scope.newInterpreterSetting.name || !$scope.newInterpreterSetting.group) {
      alert('Please determine name and interpreter');
      return;
    }

    if (_.findIndex($scope.interpreterSettings, { 'name': $scope.newInterpreterSetting.name }) >= 0) {
      alert('Name ' + $scope.newInterpreterSetting.name + ' already exists');
      return;
    }

    var newSetting = angular.copy($scope.newInterpreterSetting);

    for (var p in $scope.newInterpreterSetting.properties) {
      newSetting.properties[p] = $scope.newInterpreterSetting.properties[p].value;
    }

    $http.post(baseUrlSrv.getRestApiBase()+'/interpreter/setting', newSetting).
    success(function(data, status, headers, config) {
      $scope.resetNewInterpreterSetting();
      getInterpreterSettings();
      $scope.showAddNewSetting = false;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.resetNewInterpreterSetting = function() {
    $scope.newInterpreterSetting = {
      name : undefined,
      group : undefined,
      properties : {}
    };
    emptyNewProperty($scope.newInterpreterSetting);
  };

  $scope.removeInterpreterProperty = function(key, settingId) {
    if (settingId === undefined) {
      delete $scope.newInterpreterSetting.properties[key];
    }
    else {
      var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
      delete $scope.interpreterSettings[index].properties[key];
    }
  };

  $scope.addNewInterpreterProperty = function(settingId) {
    if(settingId === undefined) {
      // Add new property from create form
      if (!$scope.newInterpreterSetting.propertyKey || $scope.newInterpreterSetting.propertyKey === '') {
        return;
      }

      $scope.newInterpreterSetting.properties[$scope.newInterpreterSetting.propertyKey] = {
        value: $scope.newInterpreterSetting.propertyValue
      };
      emptyNewProperty($scope.newInterpreterSetting);
    }
    else {
      // Add new property from edit form
      var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
      var setting = $scope.interpreterSettings[index];

      setting.properties[setting.propertyKey] = setting.propertyValue;
      emptyNewProperty(setting);
    }
  };

  $scope.updateInterpreterSettingCluster = function(setting, cluster) {
    var index = _.findIndex($scope.interpreterSettings, { 'id': setting.id });
    console.log(cluster);
    var newProperties = angular.copy($scope.interpreterSettings[index].properties);

    if (setting.group === 'hive') {
      for (var p in newProperties) {
        if (p === 'hive.hiveserver2.url') {
          newProperties[p] = 'jdbc:hive2://' + cluster.urls.dns + ':10000';
        }
      }
    } else if (setting.group === 'psql') {
      for (var p in newProperties) {
        if (p === 'postgresql.url') {
          newProperties[p] = 'jdbc:postgresql://' + cluster.urls.dns + '/';
        }else if (p === 'postgresql.user'){
          newProperties[p] = cluster.user;
        }
      }
    }

    var request = {
      properties : newProperties,
    };

    $http.put(baseUrlSrv.getRestApiBase()+'/interpreter/setting/'+setting.id, request).
    success(function(data, status, headers, config) {
      $scope.interpreterSettings[index] = data.body;
      removeTMPSettings(index);
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  var getClusterSettings = function(settingInt) {
    $http.get(baseUrlSrv.getRestApiBase()+ '/cluster/status').
    success(function(data, status, headers, config) {
      var clusterSettings = [];
      var aux;
      console.log(settingInt);
      if (settingInt.group === 'hive' || settingInt.group === 'spark') {
        aux = 'emr';
      } else if (settingInt.group === 'redshift'){
        aux = 'redshift'
      } else if (settingInt.group === 'psql'){
        aux = 'postgres';
      }

      for (var settingId in data.body) {
        var setting = data.body[settingId];
        if (setting.engine === aux) {
          clusterSettings.push(setting);
        }
      }
      $scope.clusterSettings = clusterSettings;

      $scope.clusterSettingsOrig = jQuery.extend(true, [], $scope.clusterSettings); // to check dirty
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  var isSettingDirty = function() {
    if (angular.equals($scope.clusterSettings, $scope.clusterSettingsOrig)) {
      return false;
    } else {
      return true;
    }
  };

  $scope.toggleSetting = function(setting) {
    console.log(setting);
    if ($scope.showSetting) {
      $scope.closeSetting();
    } else {
      $scope.openSetting(setting);
    }
  };

  $scope.openSetting = function(setting) {
    $scope.showSetting = true;
    $scope.nameInt = setting.id;
    getClusterSettings(setting);
  };

  $scope.closeSetting = function() {
    if (isSettingDirty()) {
      var result = confirm('Changes will be discarded');
      if (!result) {
        return;
      }
    }
    $scope.showSetting = false;
  };

  $scope.saveSetting = function(interpreter) {
    var selectedSettingIds = [];
    var selectedId;
    var type;
    var cluster;

    for (var no in $scope.clusterSettings) {
      var setting = $scope.clusterSettings[no];
      if (setting.selected) {
        selectedSettingIds.push(setting);
      }
    }
    if (selectedSettingIds.length > 1) {
      var result = alert('Select only one cluster.');
      if (!result) {
        return;
      }
    };
    if (isSettingDirty()) {
      var result = confirm('Do you want to use this cluster in the interpreter?');
      if (!result) {
        return;
      }
    }
    console.log(selectedSettingIds);
    if (selectedSettingIds.length !== 0) {
      selectedId = selectedSettingIds[0].id;
      type = selectedSettingIds[0].type;
      cluster = selectedSettingIds[0];
    }
    console.log(selectedId);
    $http.put(baseUrlSrv.getRestApiBase() + '/cluster/set/' + interpreter.id + '/' + type + '/' + selectedId).
      success(function(data, status, headers, config) {
        console.log('Interpreter binding %o saved', cluster.urls);
        $scope.showSetting = false;
        $scope.updateInterpreterSettingCluster(interpreter, cluster);
      }).
      error(function(data, status, headers, config) {
        console.log('Error %o %o', status, data.message);
      });
  };

  var init = function() {
    $scope.resetNewInterpreterSetting();
    getInterpreterSettings();
    getAvailableInterpreters();
  };

  init();
});
