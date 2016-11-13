/**
 * Module that registers the simple room functionality
 */
var Room = {
	// times in (minutes * seconds * milliseconds)
	_FIRE_COOL_DELAY: 5 * 60 * 1000, // time after a stoke before the fire cools
	_ROOM_WARM_DELAY: 30 * 1000, // time between room temperature updates
	_BUILDER_STATE_DELAY: 0.5 * 60 * 1000, // time between builder state updates
	_STOKE_COOLDOWN: 10, // cooldown to stoke the fire
	_NEED_WOOD_DELAY: 15 * 1000, // from when the stranger shows up, to when you need wood
	
	_BAKE_SALE_DURATION: 2,
	_CHARITY_RUN_DURATION: 4,
	_CHARITY_GALA_DURATION: 6,

	_POP_DELAY: [0.1, 0.5],
	_HUT_ROOM: 4,

	buttons:{},

	Craftables: {},

	TradeGoods: {},

	MiscItems: {},

	
	Craftables: {},
	
	TradeGoods: {},
	
	MiscItems: {},
	name: _("Room"),
	init: function(options) {
		this.options = $.extend(
			this.options,
			options
		);

		Room.pathDiscovery = Boolean($SM.get('stores["compass"]'));

		if(Engine._debug) {
			this._ROOM_WARM_DELAY = 5000;
			this._BUILDER_STATE_DELAY = 5000;
			this._STOKE_COOLDOWN = 0;
			this._NEED_WOOD_DELAY = 5000;
		}

		if(typeof $SM.get('features.location.room') == 'undefined') {
			$SM.set('features.location.room', true);
			$SM.set('game.builder.level', -1);
		}

		// If this is the first time playing, the fire is dead and it's freezing.
		// Otherwise grab past save state temp and fire level.
		//$SM.set('game.temperature', $SM.get('game.temperature.value')===undefined?this.TempEnum.Freezing:$SM.get('game.temperature'));
		//$SM.set('game.fire', $SM.get('game.fire.value')===undefined?this.FireEnum.Dead:$SM.get('game.fire'));
		
		// Create the room tab
		this.tab = Header.addLocation(_("A Dark Room"), "room", Room);

		// Create the Room panel
		this.panel = $('<div>')
			.attr('id', "roomPanel")
			.addClass('location')
			.appendTo('div#locationSlider');

		Engine.updateSlider();

		// Create the bake sale button
		new Button.Button({
			id: 'bakeSaleButton',
			text: _('Hold bake sale'),
			click: Room.bakeSale,
			cooldown: Room._BAKE_SALE_DURATION,
			width: '100px'
		}).appendTo('div#roomPanel');

		// Create the charity run button
		new Button.Button({
			id: 'charityRunButton',
			text: _('Hold charity run'),
			click: Room.charityRun,
			cooldown: Room._CHARITY_RUN_DURATION,
			width: '100px'
		}).appendTo('div#roomPanel');

		// Create the charity run button
		new Button.Button({
			id: 'charityGalaButton',
			text: _('Hold charity gala'),
			click: Room.charityGala,
			cooldown: Room._CHARITY_GALA_DURATION,
			width: '100px'
		}).appendTo('div#roomPanel');

		// Create the stores container
		$('<div>').attr('id', 'storesContainer').prependTo('div#roomPanel');

		//subscribe to stateUpdates
		$.Dispatch('stateUpdate').subscribe(Room.handleStateUpdates);

		Room.updateButton();
		Room.updateStoresView();
		Room.updateIncomeView();
		Room.updateBuildButtons();
		
		//Room._fireTimer = Engine.setTimeout(Room.coolFire, Room._FIRE_COOL_DELAY);
		//Room._tempTimer = Engine.setTimeout(Room.adjustTemp, Room._ROOM_WARM_DELAY);
		
		/*
		 * Builder states:
		 * 0 - Approaching
		 * 1 - Collapsed
		 * 2 - Shivering
		 * 3 - Sleeping
		 * 4 - Helping
		 */
		if($SM.get('game.builder.level') >= 0 && $SM.get('game.builder.level') < 3) {
			Room._builderTimer = Engine.setTimeout(Room.updateBuilderState, Room._BUILDER_STATE_DELAY);
		}
		if($SM.get('game.builder.level') == 1 && $SM.get('stores.wood', true) < 0) {
			//Engine.setTimeout(Room.unlockForest, Room._NEED_WOOD_DELAY);
		}
		Engine.setTimeout($SM.collectIncome, 1000);

		//Notifications.notify(Room, _("the room is {0}", Room.TempEnum.fromInt($SM.get('game.temperature.value')).text));
		//Notifications.notify(Room, _("the fire is {0}", Room.FireEnum.fromInt($SM.get('game.fire.value')).text));
	},

	options: {}, // Nothing for now

	onArrival: function(transition_diff) {
		Room.setTitle();
		if(Room.changed) {
			//Notifications.notify(Room, _("the fire is {0}", Room.FireEnum.fromInt($SM.get('game.fire.value')).text));
			//Notifications.notify(Room, _("the room is {0}", Room.TempEnum.fromInt($SM.get('game.temperature.value')).text));
			Room.changed = false;
		}
		if($SM.get('game.builder.level') == 3) {
			$SM.add('game.builder.level', 1);
			$SM.setIncome('builder', {
				delay: 10,
				stores: {'wood' : 2 }
			});
			Room.updateIncomeView();
			Notifications.notify(Room, _("the stranger is standing by the fire. she says she can help. says she builds things."));
		}

		Engine.moveStoresView(null, transition_diff);
	},
	
	//removed fire state enums
	
	setTitle: function() {
		var title = $SM.get('game.fire.value') < 2 ? _("A Dark Room") : _("A Firelit Room");
		if(Engine.activeModule == this) {
			document.title = title;
		}
		$('div#location_room').text(title);
	},

	updateButton: function() {
		//Removed fire button updates
		var bakeSaleButton = $('#bakeSaleButton.button');
		var charityRunButton = $('#charityRunButton.button');
		var charityGalaButton = $('#charityGalaButton.button');
		charityRunButton.hide();
		charityGalaButton.hide();
		
		if (bakeSaleButton.hasClass('disabled'))	{
			Button.cooldown(bakeSaleButton);
		}
		if (charityRunButton.hasClass('disabled'))	{
			Button.cooldown(charityRunButton);
		}
		if (charityGalaButton.hasClass('disabled'))	{
			Button.cooldown(charityGalaButton);
		}
	},

	_fireTimer: null,
	_tempTimer: null,

	bakeSale: function()	{
		Notifications.notify(Room, _("You hold a fundraising bake sale"));
		var funds = $SM.get('stores.funds');
		if (!funds)
		{
			$SM.createState('stores.funds');
			$SM.set('stores.funds', 0);
			funds = 0;
		}
		var variance = Room.generateRandomInt(-2, 2);
		var profit = 10 + variance;
		$SM.addDelayed('stores.funds', profit, Room._BAKE_SALE_DURATION, "Your bake sale makes $" + profit);
		
		//if this is the first time we're holding a bake sale, members will start to join/leave afterwards.
		if (!$SM.get('game.population'))
		{
			$SM.createState('game.population', 1);
			$SM.createState('game.visibility', 1);
			Room.schedulePopUpdate();
		}
		
		$SM.add('game.visibility', 1);
		
	},

	charityRun: function()	{
		Notifications.notify(Room, _("You hold a charity run"));
		//var funds = $SM.get('stores.funds');
		var variance = Room.generateRandomInt(-50, 50);
		var profit = 200 + variance;
		$SM.addDelayed('stores.funds', profit, Room._CHARITY_RUN_DURATION, "Your charity run raised $" + profit);
		$SM.add('game.visibility', 2);
	},

	charityGala: function()	{
		Notifications.notify(Room, _("You hold a charity gala"));
		//var funds = $SM.get('stores.funds');
		var variance = Room.generateRandomInt(-75, 75);
		var profit = 600 + variance;
		$SM.addDelayed('stores.funds', profit, Room._CHARITY_GALA_DURATION, "Your charity gala raised $" + profit);
		$SM.add('game.visibility', 4);
	},
	
	//Remove onFireChange
	
	//Remove fire and temp update functions
	
	unlockForest: function() {
		$SM.set('stores.wood', 4);
		Outside.init();
		Notifications.notify(Room, _("the wind howls outside"));
		Notifications.notify(Room, _("the wood is running out"));
		Engine.event('progress', 'outside');
	},
	
	//Remove the builder
	
	updateStoresView: function() {
		var stores = $('div#stores');
		var resources = $('div#resources');
		var special = $('div#special');
		var weapons = $('div#weapons');
		var needsAppend = false, rNeedsAppend = false, sNeedsAppend = false, wNeedsAppend = false, newRow = false;
		if(stores.length === 0) {
			stores = $('<div>').attr({
				'id': 'stores',
				'data-legend': _('stores')
			}).css('opacity', 0);
			needsAppend = true;
		}
		if(resources.length === 0) {
			resources = $('<div>').attr({
				id: 'resources'
			}).css('opacity', 0);
			rNeedsAppend = true;
		}
		if(special.length === 0) {
			special = $('<div>').attr({
				id: 'special'
			}).css('opacity', 0);
			sNeedsAppend = true;
		}
		if(weapons.length === 0) {
			weapons = $('<div>').attr({
				'id': 'weapons',
				'data-legend': _('weapons')
			}).css('opacity', 0);
			wNeedsAppend = true;
		}
		for(var k in $SM.get('stores')) {

			var type = null;
			if(Room.Craftables[k]) {
				type = Room.Craftables[k].type;
			} else if(Room.TradeGoods[k]) {
				type = Room.TradeGoods[k].type;
			} else if (Room.MiscItems[k]) {
				type = Room.MiscItems[k].type;
			}

			var location;
			switch(type) {
			case 'upgrade':
				// Don't display upgrades on the Room screen
				continue;
			case 'building':
				// Don't display buildings either
				continue;
			case 'weapon':
				location = weapons;
				break;
			case 'special':
				location = special;
				break;
			default:
				location = resources;
				break;
			}

			var id = "row_" + k.replace(' ', '-');
			var row = $('div#' + id, location);
			var num = $SM.get('stores["'+k+'"]');

			if(typeof num != 'number' || isNaN(num)) {
				// No idea how counts get corrupted, but I have reason to believe that they occasionally do.
				// Build a little fence around it!
				num = 0;
				$SM.set('stores["'+k+'"]', 0);
			}

			var lk = _(k);

			// thieves?
			if(typeof $SM.get('game.thieves') == 'undefined' && num > 5000 && $SM.get('features.location.world')) {
				$SM.startThieves();
			}

			if(row.length === 0) {
				row = $('<div>').attr('id', id).addClass('storeRow');
				$('<div>').addClass('row_key').text(lk).appendTo(row);
				$('<div>').addClass('row_val').text(Math.floor(num)).appendTo(row);
				$('<div>').addClass('clear').appendTo(row);
				var curPrev = null;
				location.children().each(function(i) {
					var child = $(this);
					var cName = child.children('.row_key').text();
					if(cName < lk) {
						curPrev = child.attr('id');
					}
				});
				if(curPrev == null) {
					row.prependTo(location);
				} else {
					row.insertAfter(location.find('#' + curPrev));
				}
				newRow = true;
			} else {
				$('div#' + row.attr('id') + ' > div.row_val', location).text(Math.floor(num));
			}
		}

		if(rNeedsAppend && resources.children().length > 0) {
			resources.prependTo(stores);
			resources.animate({opacity: 1}, 300, 'linear');
		}

		if(sNeedsAppend && special.children().length > 0) {
			special.appendTo(stores);
			special.animate({opacity: 1}, 300, 'linear');
		}

		if(needsAppend && stores.find('div.storeRow').length > 0) {
			stores.appendTo('div#storesContainer');
			stores.animate({opacity: 1}, 300, 'linear');
		}

		if(wNeedsAppend && weapons.children().length > 0) {
			weapons.appendTo('div#storesContainer');
			weapons.animate({opacity: 1}, 300, 'linear');
		}

		if(newRow) {
			Room.updateIncomeView();
		}

		if($("div#outsidePanel").length) {
			Outside.updateVillage();
		}

		if($SM.get('stores.compass') && !Room.pathDiscovery){
			Room.pathDiscovery = true;
			Path.openPath();
		}
	},

	updateIncomeView: function() {
		var stores = $('div#resources');
		var totalIncome = {};
		if(stores.length === 0 || typeof $SM.get('income') == 'undefined') return;
		$('div.storeRow', stores).each(function(index, el) {
			el = $(el);
			$('div.tooltip', el).remove();
			var tt = $('<div>').addClass('tooltip bottom right');
			var storeName = el.attr('id').substring(4).replace('-', ' ');
			for(var incomeSource in $SM.get('income')) {
				var income = $SM.get('income["'+incomeSource+'"]');
				for(var store in income.stores) {
					if(store == storeName && income.stores[store] !== 0) {
						$('<div>').addClass('row_key').text(_(incomeSource)).appendTo(tt);
						$('<div>')
							.addClass('row_val')
							.text(Engine.getIncomeMsg(income.stores[store], income.delay))
							.appendTo(tt);
						if (!totalIncome[store] || totalIncome[store].income === undefined) {
							totalIncome[store] = { income: 0 };
						}
						totalIncome[store].income += Number(income.stores[store]);
						totalIncome[store].delay = income.delay;
					}
				}
			}
			if(tt.children().length > 0) {
				var total = totalIncome[storeName].income;
				$('<div>').addClass('total row_key').text(_('total')).appendTo(tt);
				$('<div>').addClass('total row_val').text(Engine.getIncomeMsg(total, totalIncome[storeName].delay)).appendTo(tt);
				tt.appendTo(el);
			}
		});
	},

	buy: function(buyBtn) {
		var thing = $(buyBtn).attr('buildThing');
		var good = Room.TradeGoods[thing];
		var numThings = $SM.get('stores["'+thing+'"]', true);
		if(numThings < 0) numThings = 0;
		if(good.maximum <= numThings) {
			return;
		}

		var storeMod = {};
		var cost = good.cost();
		for(var k in cost) {
			var have = $SM.get('stores["'+k+'"]', true);
			if(have < cost[k]) {
				Notifications.notify(Room, _("not enough " + k));
				return false;
			} else {
				storeMod[k] = have - cost[k];
			}
		}
		$SM.setM('stores', storeMod);

		Notifications.notify(Room, good.buildMsg);

		$SM.add('stores["'+thing+'"]', 1);
	},

	build: function(buildBtn) {
		var thing = $(buildBtn).attr('buildThing');
		if($SM.get('game.temperature.value') <= Room.TempEnum.Cold.value) {
			Notifications.notify(Room, _("builder just shivers"));
			return false;
		}
		var craftable = Room.Craftables[thing];

		var numThings = 0;
		switch(craftable.type) {
		case 'good':
		case 'weapon':
		case 'tool':
		case 'upgrade':
			numThings = $SM.get('stores["'+thing+'"]', true);
			break;
		case 'building':
			numThings = $SM.get('game.buildings["'+thing+'"]', true);
			break;
		}

		if(numThings < 0) numThings = 0;
		if(craftable.maximum <= numThings) {
			return;
		}

		var storeMod = {};
		var cost = craftable.cost();
		for(var k in cost) {
			var have = $SM.get('stores["'+k+'"]', true);
			if(have < cost[k]) {
				Notifications.notify(Room, _("not enough "+k));
				return false;
			} else {
				storeMod[k] = have - cost[k];
			}
		}
		$SM.setM('stores', storeMod);

		Notifications.notify(Room, craftable.buildMsg);

		switch(craftable.type) {
		case 'good':
		case 'weapon':
		case 'upgrade':
		case 'tool':
			$SM.add('stores["'+thing+'"]', 1);
			break;
		case 'building':
			$SM.add('game.buildings["'+thing+'"]', 1);
			break;
		}
	},

	needsWorkshop: function(type) {
		return type == 'weapon' || type == 'upgrade' || type =='tool';
	},

	craftUnlocked: function(thing) {
		if(Room.buttons[thing]) {
			return true;
		}
		if($SM.get('game.builder.level') < 4) return false;
		var craftable = Room.Craftables[thing];
		if(Room.needsWorkshop(craftable.type) && $SM.get('game.buildings["'+'workshop'+'"]', true) === 0) return false;
		var cost = craftable.cost();

		//show button if one has already been built
		if($SM.get('game.buildings["'+thing+'"]') > 0){
			Room.buttons[thing] = true;
			return true;
		}
		// Show buttons if we have at least 1/2 the wood, and all other components have been seen.
		if($SM.get('stores.wood', true) < cost['wood'] * 0.5) {
			return false;
		}
		for(var c in cost) {
			if(!$SM.get('stores["'+c+'"]')) {
				return false;
			}
		}

		Room.buttons[thing] = true;
		//don't notify if it has already been built before
		if(!$SM.get('game.buildings["'+thing+'"]')){
			Notifications.notify(Room, craftable.availableMsg);
		}
		return true;
	},

	buyUnlocked: function(thing) {
		if(Room.buttons[thing]) {
			return true;
		} else if($SM.get('game.buildings["trading post"]', true) > 0) {
			if(thing == 'compass' || typeof $SM.get('stores["'+thing+'"]') != 'undefined') {
				// Allow the purchase of stuff once you've seen it
				return true;
			}
		}
		return false;
	},

	updateBuildButtons: function() {
		var buildSection = $('#buildBtns');
		var needsAppend = false;
		if(buildSection.length === 0) {
			buildSection = $('<div>').attr({'id': 'buildBtns', 'data-legend': _('build:')}).css('opacity', 0);
			needsAppend = true;
		}

		var craftSection = $('#craftBtns');
		var cNeedsAppend = false;
		if(craftSection.length === 0 && $SM.get('game.buildings["workshop"]', true) > 0) {
			craftSection = $('<div>').attr({'id': 'craftBtns', 'data-legend': _('craft:')}).css('opacity', 0);
			cNeedsAppend = true;
		}

		var buySection = $('#buyBtns');
		var bNeedsAppend = false;
		if(buySection.length === 0 && $SM.get('game.buildings["trading post"]', true) > 0) {
			buySection = $('<div>').attr({'id': 'buyBtns', 'data-legend': _('buy:')}).css('opacity', 0);
			bNeedsAppend = true;
		}

		for(var k in Room.Craftables) {
			craftable = Room.Craftables[k];
			var max = $SM.num(k, craftable) + 1 > craftable.maximum;
			if(craftable.button == null) {
				if(Room.craftUnlocked(k)) {
					var loc = Room.needsWorkshop(craftable.type) ? craftSection : buildSection;
					craftable.button = new Button.Button({
						id: 'build_' + k,
						cost: craftable.cost(),
						text: _(k),
						click: Room.build,
						width: '80px',
						ttPos: loc.children().length > 10 ? 'top right' : 'bottom right'
					}).css('opacity', 0).attr('buildThing', k).appendTo(loc).animate({opacity: 1}, 300, 'linear');
				}
			} else {
				// refresh the tooltip
				var costTooltip = $('.tooltip', craftable.button);
				costTooltip.empty();
				var cost = craftable.cost();
				for(var k in cost) {
					$("<div>").addClass('row_key').text(_(k)).appendTo(costTooltip);
					$("<div>").addClass('row_val').text(cost[k]).appendTo(costTooltip);
				}
				if(max && !craftable.button.hasClass('disabled')) {
					Notifications.notify(Room, craftable.maxMsg);
				}
			}
			if(max) {
				Button.setDisabled(craftable.button, true);
			} else {
				Button.setDisabled(craftable.button, false);
			}
		}

		for(var k in Room.TradeGoods) {
			good = Room.TradeGoods[k];
			var max = $SM.num(k, good) + 1 > good.maximum;
			if(good.button == null) {
				if(Room.buyUnlocked(k)) {
					good.button = new Button.Button({
						id: 'build_' + k,
						cost: good.cost(),
						text: _(k),
						click: Room.buy,
						width: '80px'
					}).css('opacity', 0).attr('buildThing', k).appendTo(buySection).animate({opacity:1}, 300, 'linear');
				}
			} else {
				// refresh the tooltip
				var costTooltip = $('.tooltip', good.button);
				costTooltip.empty();
				var cost = good.cost();
				for(var k in cost) {
					$("<div>").addClass('row_key').text(_(k)).appendTo(costTooltip);
					$("<div>").addClass('row_val').text(cost[k]).appendTo(costTooltip);
				}
				if(max && !good.button.hasClass('disabled')) {
					Notifications.notify(Room, good.maxMsg);
				}
			}
			if(max) {
				Button.setDisabled(good.button, true);
			} else {
				Button.setDisabled(good.button, false);
			}
		}

		if(needsAppend && buildSection.children().length > 0) {
			buildSection.appendTo('div#roomPanel').animate({opacity: 1}, 300, 'linear');
		}
		if(cNeedsAppend && craftSection.children().length > 0) {
			craftSection.appendTo('div#roomPanel').animate({opacity: 1}, 300, 'linear');
		}
		if(bNeedsAppend && buildSection.children().length > 0) {
			buySection.appendTo('div#roomPanel').animate({opacity: 1}, 300, 'linear');
		}
	},

	compassTooltip: function(direction){
		var tt = $('<div>').addClass('tooltip bottom right');
		$('<div>').addClass('row_key').text(_('the compass points '+ direction)).appendTo(tt);
		tt.appendTo($('#row_compass'));
	},

	handleStateUpdates: function(e){
		if(e.category == 'stores'){
			Room.updateStoresView();
			Room.updateBuildButtons();
		} else if(e.category == 'income'){
			Room.updateStoresView();
			Room.updateIncomeView();
		} else if(e.stateName.indexOf('game.buildings') === 0){
			Room.updateBuildButtons();
		}
	},

	updatePopulation: function() {
		var space = $SM.get('game.visibility') - $SM.get('game.population');
		if(space > 0) {
			var num = Math.floor(Math.random()*(space/2) + space/2);
			if(num === 0) num = 1;
			if(num == 1) {
				Notifications.notify(null, _('A new member joins the chapter'));
			} else if(num < 5) {
				Notifications.notify(null, _('A few transfer students want to get involved.'));
			}
			else {
				Notifications.notify(null, _("An excited bunch of first years show up at the most recent meeting."));
			}
			Engine.log('population increased by ' + num);
			$SM.add('game.population', num);
		}
		if(space < 0) {
			if(space === -1){
				Notifications.notify(null, _('A member quits the chapter'));
			}
			else{
				Notifications.notify(null, _('Members quit the chapter'));
			}
			$SM.add('game.population', space)
			if($SM.get('game.population') < 0) {
				$SM.set('game.population', 0);
			}
		}
		
		if ($SM.get('game.visibility') > 1) {
			$SM.add('game.visibility', -1);
		}
		
		Engine.log('Population is now: ' + $SM.get('game.population'));
		Engine.log('Visibility is now: ' + $SM.get('game.visibility'));
		Room.schedulePopUpdate();
		var bakeSaleButton = $('#bakeSaleButton.button');
		var charityRunButton = $('#charityRunButton.button');
		var charityGalaButton = $('#charityGalaButton.button');
		if ($SM.get('game.population') > 10)	{
			charityRunButton.show();
		}
		
		if ($SM.get('game.population') > 20)	{
			charityGalaButton.show();
		}
		
	},

	schedulePopUpdate: function() {
		var nextUpdate = Math.floor(Math.random()*(Room._POP_DELAY[1] - Room._POP_DELAY[0])) + Room._POP_DELAY[0];
		Engine.log('next population update scheduled in ' + nextUpdate + ' minutes');
		Room._popTimeout = Engine.setTimeout(Room.updatePopulation, nextUpdate * 60 * 1000);
	},
	
	generateRandomInt: function(min, max)	{
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
};
