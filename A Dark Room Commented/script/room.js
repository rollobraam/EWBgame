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
	_INCOME_DELAY: 10 * 1000,
	_HUT_ROOM: 4,

	buttons:{},

	Craftables: {
		'well': {
			name: _('well'),
			button: null,
			maximum: 10,
			availableMsg: _('Start planning your well-building trip.'),
			buildMsg: _('You construct a well, bringing water to the thirsty.'),
			maxMsg: _("You have built all the wells your chapter can support."),
			type: 'building',
			cost: function() {
				return {
					'funds': 0
				};
			}
		}
	},

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
		}
		
		// Create the room tab
		this.tab = Header.addLocation(_("A Meeting Room"), "room", Room);

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
		$('<div>').attr('id', 'workers').appendTo('div#roomPanel');

		//subscribe to stateUpdates
		$.Dispatch('stateUpdate').subscribe(Room.handleStateUpdates);

		Room.updateButton();
		Room.updateStoresView();
		Room.updateIncomeView();
		Room.updateBuildButtons();
		Room.updateWorkersView();
		
		// This is where we could put an event for an "introduction"
		
		Notifications.notify(Room, _("People are thirsty"));
		
		//Engine.setTimeout($SM.collectIncome, 1000);
		Engine.setTimeout(Room.updateFunds, Room._INCOME_DELAY);
	},

	options: {}, // Nothing for now
	
	updateRoom: function()	{
		Room.updateButton();
		Room.updateStoresView();
		Room.updateIncomeView();
		Room.updateBuildButtons();
		Room.updateWorkersView();
	},

	onArrival: function(transition_diff) {
		Room.setTitle();
		if(Room.changed) {
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
		var title = _("EWB Meeting Room");
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
				location = resources;
			default:
				location = stores;
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
				//if we are just introducing wells, we need to start well decay
				if (k == 'well')	{
					Engine.setInterval(Room.breakWell, 15000); // NB: Use setTimeout to only fire once, then set a Timeout again within the breakWell function, for dynamic timing with wellMaintenance.
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
			numThings = $SM.get('stores["'+thing+'"]', true);
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
				Notifications.notify(Room, _("You don't have enough "+k));
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
			$SM.add('stores["'+thing+'"]', 1);
			break;
		}
		Room.updateStoresView();
	},

	needsWorkshop: function(type) {
		return type == 'weapon' || type == 'upgrade' || type =='tool';
	},

	craftUnlocked: function(thing) {
		if(Room.buttons[thing]) {
			return true;
		}

		var craftable = Room.Craftables[thing];
		if(Room.needsWorkshop(craftable.type) && $SM.get('game.buildings["'+'workshop'+'"]', true) === 0) return false;
		var cost = craftable.cost();

		//show button if one has already been built
		if($SM.get('game.buildings["'+thing+'"]') > 0){
			Room.buttons[thing] = true;
			return true;
		}
		// Show buttons if we have at least 1/2 the wood, and all other components have been seen.
		if(craftable.name != 'well' && $SM.get('stores.funds', true) < cost['funds'] * 0.5) {
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
		Room.updateWorkersView();
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
		Room.updateWorkersView();
	},

	schedulePopUpdate: function() {
		var nextUpdate = Math.floor(Math.random()*(Room._POP_DELAY[1] - Room._POP_DELAY[0])) + Room._POP_DELAY[0];
		Engine.log('next population update scheduled in ' + nextUpdate + ' minutes');
		Room._popTimeout = Engine.setTimeout(Room.updatePopulation, nextUpdate * 60 * 1000);
	},
	
	// Functions for the assignment of members to different tasks - BACKLOG
	updateWorkersView: function() {
		var workers = $('div#workers');

		// If our population is 0 and we don't already have a workers view,
		// there's nothing to do here.
		if(!workers.length && $SM.get('game.population') === 0) return;

		var needsAppend = false;
		if(workers.length === 0) {
			needsAppend = true;
			workers = $('<div>').attr('id', 'workers').css('opacity', 0);
		}

		var numMembers = $SM.get('game.population');
		var member = $('div#workers_row_member', workers);

		for(var k in $SM.get('game.workers')) {
			var lk = _(k);
			var workerCount = $SM.get('game.workers["'+k+'"]');
			var row = $('div#workers_row_' + k.replace(' ', '-'), workers);
			if(row.length === 0) {
				row = Room.makeWorkerRow(k, workerCount);

				var curPrev = null;
				workers.children().each(function(i) {
					var child = $(this);
					var cName = child.children('.row_key').text();
					if(cName != 'member') {
						if(cName < lk) {
							curPrev = child.attr('id');
						}
					}
				});
				if(curPrev == null && member.length === 0) {
					row.prependTo(workers);
				} else if(curPrev == null) {
					row.insertAfter(member);
				} else {
					row.insertAfter(workers.find('#'+ curPrev));
				}

			} else {
				$('div#' + row.attr('id') + ' > div.row_val > span', workers).text(workerCount);
			}
			// If this is Maintenance, it doesn't follow the same rules as workers, since it is funding and not people being allocated
            if (k != 'Maintenance') {
                numMembers -= workerCount;
            }

			if(workerCount === 0) {
				$('.dnBtn', row).addClass('disabled');
				$('.dnManyBtn', row).addClass('disabled');
			} else {
				$('.dnBtn', row).removeClass('disabled');
				$('.dnManyBtn', row).removeClass('disabled');
			}
		}

		if(member.length === 0) {
			member = Room.makeWorkerRow('member', numMembers);
			member.prependTo(workers);
		} else {
			$('div#workers_row_member > div.row_val > span', workers).text(numMembers);
		}
		
		// Only create the Maintenance row if Wells have been created and we have not created the row for Maintenance yet
		var well_maint = $('div#workers_row_Maintenance');
		if(typeof $SM.get('stores.well') != 'undefined' && well_maint.length === 0) {
            wellMaint = Room.makeWorkerRow('Maintenance', 0);
            wellMaint.appendTo(workers);
        }
		
		if(numMembers === 0) {
			$('.upBtn', '#workers').addClass('disabled');
			$('.upManyBtn', '#workers').addClass('disabled');
		} else {
			$('.upBtn', '#workers').removeClass('disabled');
			$('.upManyBtn', '#workers').removeClass('disabled');
		}


		if(needsAppend && workers.children().length > 0) {
			workers.appendTo('#roomPanel').animate({opacity:1}, 300, 'linear');
		}
	},
	
	makeWorkerRow: function(key, num) {
		//name = Room._INCOME[key].name;
		name = key;
		//if(!name) name = key;
		var row = $('<div>')
			.attr('key', key)
			.attr('id', 'workers_row_' + key.replace(' ','-'))
			.addClass('workerRow');
		$('<div>').addClass('row_key').text(name).appendTo(row);
		var val = $('<div>').addClass('row_val').appendTo(row);

		$('<span>').text(num).appendTo(val);
		
		if(key != 'member' && key != 'Maintenance') {
			$('<div>').addClass('upBtn').appendTo(val).click([1], Room.increaseWorker);
			$('<div>').addClass('dnBtn').appendTo(val).click([1], Room.decreaseWorker);
			$('<div>').addClass('upManyBtn').appendTo(val).click([10], Room.increaseWorker);
			$('<div>').addClass('dnManyBtn').appendTo(val).click([10], Room.decreaseWorker);
		}
		else if (key == 'Maintenance')	{
			$('<div>').addClass('upBtn').appendTo(val).click([10], Room.increaseFunding);
			$('<div>').addClass('dnBtn').appendTo(val).click([10], Room.decreaseFunding);
			$('<div>').addClass('upManyBtn').appendTo(val).click([50], Room.increaseFunding);
			$('<div>').addClass('dnManyBtn').appendTo(val).click([50], Room.decreaseFunding);
		}

		$('<div>').addClass('clear').appendTo(row);

		return row;
	},

	increaseWorker: function(btn) {
		var worker = $(this).closest('.workerRow').attr('key');
		if(Room.getNumMembers() > 0) {
			var increaseAmt = Math.min(Room.getNumMembers(), btn.data);
			Engine.log('increasing ' + worker + ' by ' + increaseAmt);
			$SM.add('game.workers["'+worker+'"]', increaseAmt);
		}
	},

	decreaseWorker: function(btn) {
		var worker = $(this).closest('.workerRow').attr('key');
		if($SM.get('game.workers["'+worker+'"]') > 0) {
			var decreaseAmt = Math.min($SM.get('game.workers["'+worker+'"]') || 0, btn.data);
			Engine.log('decreasing ' + worker + ' by ' + decreaseAmt);
			$SM.add('game.workers["'+worker+'"]', decreaseAmt * -1);
		}
	},
	
	increaseFunding: function(btn) {
        var program = $(this).closest('.workerRow').attr('key');
		var increaseAmt = btn.data[0];
        if($SM.get('stores.funds') > 0) {
			// We need to check to make sure we do not invest more than we have.
			var max = $SM.get('stores.funds');
			if (typeof $SM.get('game.workers["'+program+'"]') == 'undefined')	{
				$SM.createState('game.workers["'+program+'"]');
			}
			var current = typeof $SM.get('game.workers["'+program+'"]') == 'undefined' ? 0 : $SM.get('game.workers["'+program+'"]');
			var diff = max - current;
			if (current + increaseAmt > max)
			{
				Engine.log('increasing ' + program + ' by ' + diff);
				$SM.add('game.workers["'+program+'"]', diff);
			}
			else{
				Engine.log('increasing ' + program + ' by ' + increaseAmt);
				$SM.add('game.workers["'+program+'"]', increaseAmt);
			}
        }
    },
    
    decreaseFunding: function(btn) {
        var program = $(this).closest('.workerRow').attr('key');
        if($SM.get('game.workers["'+program+'"]') > 0) {
            var decreaseAmt = Math.min($SM.get('game.workers["'+program+'"]') || 0, btn.data);
            Engine.log('decreasing ' + program + ' by ' + decreaseAmt);
            $SM.add('game.workers["'+program+'"]', decreaseAmt * -1);
        }
    },

	getNumMembers: function() {
		var num = $SM.get('game.population');
        //for(var k in $SM.get('game.workers')) {
        //    num -= $SM.get('game.workers["'+k+'"]');
        //}
        return num;
	},
	//Well health decays over time, this function will determine how long before the next well breaks
	//Returns the time delay until the next well breakage
	//TODO
	calculateWellDecay: function()	{
		var numWells = $SM.get('stores.well');
		var WMP = $SM.get('game.wellMaintenancePoints');
		Engine.log("Maintenance: " + $SM.get('game.wellMaintenancePoints'));
	},
	
	//TODO convert to use Maintenance
	breakWell: function() {
		var numWells = $SM.get('stores.well');
		//Handle the case where this is the first well that has broken, so we need to introduce the concept of "Maintenance"
		if (typeof $SM.get('stores.well_broken') == 'undefined')	{
			$SM.createState('stores.well_broken', 0);
			$SM.createState('game.wellMaintenancePoints', 0);
			Engine.log( "Maintenance: " + $SM.get('game.wellMaintenancePoints') );
		}
		if (numWells > 0)	{
			$SM.add('stores.well', -1);
			$SM.add('stores.well_broken', 1);
		}
		Notifications.notify(Room, "One of your wells has stopped working!");
		Room.updateStoresView;
	},
	
	fixWell: function()	{
		$SM.add('stores.well', 1);
		$SM.add('stores.well_broken', -1);
	},
	
	// This function will handle the inflow and outflow of cash for the chapter.
	// For  now, the only contributing element is the Maintenance, but in the future things such as Operational Costs, Grants, etc. can be added here
	updateFunds: function ()	{
		if ($SM.get('stores.well') == 0)	{
			Engine.setTimeout(Room.updateFunds, Room._INCOME_DELAY);
			return;
		}
		var wellMaint = $SM.get('game.workers["Maintenance"]');
		if (wellMaint == undefined)	{  //Do nothing (for now) if there is no well maintenance.  Later, we could add other cashflow items, then this will be an oversimplification.
			Engine.setTimeout(Room.updateFunds, Room._INCOME_DELAY);
			return;
		}
		var funds = $SM.get('stores.funds');
		if (funds < wellMaint)	{
			$SM.set('stores.funds', 0);
			$SM.set('game.workers["Maintenance"]', 0);
			Notifications.notify("Well maintance exceeds your current funds!");
			Engine.setTimeout(Room.updateFunds, Room._INCOME_DELAY);
			return;
		}
		$SM.add('stores.funds', wellMaint * -1);
		Notifications.notify(Room, ("Well Maintenance cost $" + wellMaint));
		Engine.log("Well maintenance cost " + wellMaint);
		Engine.setTimeout(Room.updateFunds, Room._INCOME_DELAY);
		return;
	},
	
	generateRandomInt: function(min, max)	{
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
};
