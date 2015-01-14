/**
 * This file is part of Superdesk.
 *
 * Copyright 2013, 2014 Sourcefabric z.u. and contributors.
 *
 * For the full copyright and license information, please see the
 * AUTHORS and LICENSE files distributed with this source code, or
 * at https://www.sourcefabric.org/superdesk/license
 */

define([
    'angular',
    'ng-sir-trevor'
], function(angular) {
    'use strict';
    angular
    .module('SirTrevorBlocks', [])
        .config(['SirTrevorProvider', function(SirTrevor) {
            // Add toMeta method to all blocks.
            SirTrevor.Block.prototype.toMeta = function(){return;};
            SirTrevor.Block.prototype.getOptions = function(){return SirTrevor.$get().getInstance(this.instanceID).options;};

            SirTrevor.Blocks.Quote =  SirTrevor.Block.extend({

                type: 'quote',

                title: function(){ return window.i18n.t('blocks:quote:title'); },

                icon_name: 'quote',

                editorHTML: function() {
                    var template = _.template([
                        '<div class="st-required st-text-block st-quote-block quote-input" ',
                        ' placeholder="quote" contenteditable="true"></div>',
                        '<div contenteditable="true" name="cite" placeholder="<%= i18n.t("blocks:quote:credit_field") %>"',
                        ' class="st-text-block js-cite-input st-quote-block"></div>'
                    ].join('\n'));
                    return template(this);
                },
                focus: function() {
                    this.$('.quote-input').focus();
                },
                retrieveData: function() {
                    return {
                        quote: this.$('.quote-input').text() || undefined,
                        credit: this.$('.js-cite-input').text() || undefined
                    };
                },
                loadData: function(data){
                    this.$('.quote-input').text(SirTrevor.toHTML(data.text, this.type));
                    this.$('.js-cite-input').text(data.credit);
                },
                toMarkdown: function(markdown) {
                    return markdown.replace(/^(.+)$/mg,'> $1');
                },
                toHTML: function(html) {
                    var data = this.retrieveData();
                    return [
                        '<blockquote><p>',
                        data.quote,
                        '</p><ul><li>',
                        data.credit,
                        '</li></ul></blockquote>'
                    ].join('');
                },
                toMeta: function() {
                    return this.retrieveData();
                }
            });

            // Image Block
            var upload_options = {
            // NOTE: responsive layout is currently disabled. so row and col-md-6 are useless
                html: [
                    '<div class="row st-block__upload-container">',
                    '    <input type="file" type="st-file-upload" />',
                    '    <div class="col-md-6">',
                    '        <button class="btn btn-default"><%= i18n.t("general:upload") %></button>',
                    '    </div>',
                    '</div>'
                ].join('\n')
            };
            SirTrevor.DEFAULTS.Block.upload_options = upload_options;
            SirTrevor.Locales.en.general.upload = 'Select from folder';
            SirTrevor.Blocks.Image =  SirTrevor.Block.extend({
                type: 'Image',
                title: function() {
                    return 'Image';
                },
                droppable: true,
                uploadable: true,
                icon_name: 'image',
                loadData: function(data) {
                    var file_url = (typeof(data.file) !== 'undefined') ? data.file.url : data.media._url;
                    this.$editor.html($('<img>', {
                        src: file_url
                    })).show();
                    this.$editor.append($('<div>', {
                        name: 'caption',
                        class: 'st-image-block st-text-block',
                        contenteditable: true,
                        placeholder: 'Add a description'
                    }).html(data.caption));
                    this.$editor.append($('<div>', {
                        name: 'credit',
                        class: 'st-image-block st-text-block',
                        contenteditable: true,
                        placeholder: 'Add author / photographer'
                    }).html(data.credit));
                },
                onBlockRender: function() {
                    // assert we have an uploader function in options
                    if (typeof(this.getOptions().uploader) !== 'function') {
                        throw 'Image block need an `uploader` function in options.';
                    }
                    // setup the upload button
                    this.$inputs.find('button').bind('click', function(ev) {
                        ev.preventDefault();
                    });
                    this.$inputs.find('input').on('change', _.bind(function(ev) {
                        this.onDrop(ev.currentTarget);
                    }, this));
                },
                onDrop: function(transferData) {
                    var that = this;
                    var file = transferData.files[0];
                    var urlAPI = window.URL;
                    if (typeof urlAPI === 'undefined') {
                        urlAPI = window.webkitURL;
                    }
                    // Handle one upload at a time
                    if (/image/.test(file.type)) {
                        this.loading();
                        // Show this image on here
                        this.$inputs.hide();
                        this.loadData({
                            file: {
                                url: urlAPI.createObjectURL(file)
                            }
                        });
                        this.getOptions().uploader(
                            file,
                            function(data) {
                                that.setData(data);
                                that.ready();
                            },
                            function(error) {
                                var message = error || window.i18n.t('blocks:image:upload_error');
                                that.addMessage(message);
                                that.ready();
                            }
                        );
                    }
                },
                retrieveData: function() {
                    return {
                        media: this.getData().media,
                        caption: this.$('[name=caption]').text(),
                        credit: this.$('[name=credit]').text()
                    };
                },
                toHTML: function() {
                    var data = this.retrieveData(),
                        htmlCredit = '</figcaption>';
                    if (data.credit) {
                        htmlCredit = ' from ' + data.credit + '.</figcaption>';
                    }
                    return [
                        '<figure>',
                        '    <img src="' + data.media._url + '" alt="' + data.caption + '"/>',
                        '    <figcaption>' + data.caption + htmlCredit,
                        '</figure>'
                    ].join('');
                },
                toMeta: function() {
                    return this.retrieveData();
                }
            });

            // Add toHTML to existing Text Block.
            SirTrevor.Blocks.Text.prototype.toHTML = function() {
                return this.getTextBlock().html();
            };

            var Strikethrough = SirTrevor.Formatter.extend({
                title: 'strikethrough',
                iconName: 'strikethrough',
                cmd: 'strikeThrough',
                text: 'S'
            });
            SirTrevor.Formatters.Strikethrough = new Strikethrough();

            var OrderedList = SirTrevor.Formatter.extend({
                title: 'orderedlist',
                iconName: 'link',
                cmd: 'insertOrderedList',
                text: 'orderedlist'
            });
            SirTrevor.Formatters.NumberedList = new OrderedList();

            var UnorderedList = SirTrevor.Formatter.extend({
                title: 'unorderedlist',
                iconName: 'link',
                cmd: 'insertUnorderedList',
                text: 'unorderedlist'
            });
            SirTrevor.Formatters.BulletList = new UnorderedList();

        }]);
});
