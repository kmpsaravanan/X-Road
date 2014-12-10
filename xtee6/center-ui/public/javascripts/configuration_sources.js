var SDSB_CONFIGURATION_SOURCE = function() {
    var oSigningKeys, oConfParts;
    var tab = "#source_tab";

    var tr_prefix = "configuration_management.source_tab.";

    function enableActions() {
        $("#activate_signing_key, #delete_signing_key").disable();
        $("#upload_conf_part, #download_conf_part").disable();

        if (oSigningKeys.getFocus()) {
            var selectedKey = oSigningKeys.getFocusData();

            if (!selectedKey.active) {
                $("#activate_signing_key").enable();
                $("#delete_signing_key").enable();
            } else {
                $("#activate_signing_key, #delete_signing_key").disable();
            }
        }

        if (getSourceType() == "external") {
            $("#upload_conf_part").hide();
        } else {
            $("#upload_conf_part").show();
        }

        if (oConfParts.getFocus()) {
            $("#download_conf_part").enable();

            var selectedPart = oConfParts.getFocusData();
            if (selectedPart.optional) {
                $("#upload_conf_part").enable();
            }

            var downloadButton = $("#download_conf_part")

            if (selectedPart.updated_at != null) {
                downloadButton.enable();
            } else {
                downloadButton.disable();
            }
        }
    }

    function getSourceType() {
        return $(".ui-tabs-active a").data("source-type");
    }

    function uploadCallback(response) {
        var data = response.data;

        if (response.success) {
            $("#upload_conf_part_dialog").dialog("close");
            oConfParts.fnReplaceData(data.parts);
        }

        renderStandardError(data.stderr);

        showMessages(response.messages);
    }

    function renderStandardError(errorLines) {
        if (errorLines.length == 0) {
            return;
        }

        var dialogTitle =
            _("configuration_management.source_tab.part_validator_stderr_title");

        initConsoleOutput(errorLines, dialogTitle, "320");
    }

    function __(text, params) {
        return _(tr_prefix + text, params);
    }

    function initSourceTables() {
        var opts = scrollableTableOpts(200);
        opts.sDom = "t";
        opts.asStripeClasses = [];
        opts.aoColumns = [
            {
                "mData": function(source, type, val) {
                    var tokenFriendlyName =
                        source.hasOwnProperty("token_friendly_name")
                            ? source.token_friendly_name
                            : "&lt;" + __("device_not_found") + "&gt;";

                    return tokenFriendlyName + ": " + source.key_id;
                }
            },
            {
                "mData": "key_generated_at",
                "sWidth": "13em"
            },
            {
                "mData": function(source, type, val) {
                    if (!source.hasOwnProperty("token_active")) {
                        return "";
                    }

                    if ((source.token_active && !can("deactivate_token")) ||
                        (!source.token_active && !can("activate_token"))) {
                        return "";
                    }

                    var button = $("<button>")
                        .attr("data-token_id", source.token_id);

                    if (source.token_active) {
                        button.text(__("logout")).addClass("logout");
                    } else {
                        button.text(__("login")).addClass("login");
                    }

                    return $("<p>").append(button).html();
                },
                "sWidth": "8em"
            }
        ];
        opts.fnRowCallback = function(nRow, oData) {
            if (oData.active) {
                $(nRow).addClass("semibold");
            }

            if (!oData.key_available) {
                $(nRow).addClass("unavailable");
            }
        };
        opts.asRowId = ["key_id"];

        oSigningKeys = $("#signing_keys").dataTable(opts);

        $("#signing_keys").on("click", "tbody tr", function() {
            if (oSigningKeys.getFocus() == this) {
                oSigningKeys.removeFocus();
            } else {
                oSigningKeys.setFocus(0, this);
            }
            enableActions();
        });

        opts.aoColumns = [
            { "mData": "file_name" },
            { "mData": "content_identifier", "sClass": "lowercase" },
            { "mData": "updated_at" }
        ];

        opts.fnRowCallback = function(nRow, oData) {
            if (oData.updated_at == null) {
                $(nRow).addClass("unavailable");
            }
        };

        opts.asRowId = ["content_identifier"];

        oConfParts = $("#conf_parts").dataTable(opts);

        $("#conf_parts").on("click", "tbody tr", function() {
            if (oConfParts.getFocus() == this) {
                oConfParts.removeFocus();
            } else {
                oConfParts.setFocus(0, this);
            }
            enableActions();
        });
    }

    function initSourceAnchorActions() {
        $("#generate_source_anchor").click(function() {
            var params = {
                source_type: getSourceType()
            };

            $.post(action("generate_source_anchor"), params, function(response) {
                refreshWithData(response.data);
            }, "json");
        });

        $("#download_source_anchor").click(function() {
            window.location =
                "configuration_management/download_source_anchor?source_type=" +
                getSourceType();
        });
    }

    function initSigningKeysActions() {
        $("#generate_signing_key_dialog").initDialog({
            autoOpen: false,
            modal: true,
            height: 200,
            width: 500,
            buttons: [
            { text : _("common.ok"),
              click : function() {
                  var dialog = this;

                  var params = {
                      source_type: getSourceType(),
                      token_id: $("#token_id", this).val()
                  };

                  var generate = function() {
                      $.post(action("generate_signing_key"), params, function(response) {
                          refreshWithData(response.data);
                          $(dialog).dialog("close");
                      }, "json");
                  };

                  if ($("#token_id option:selected").is(".inactive")) {
                      activateToken(params.token_id, generate);
                  } else {
                      generate();
                  }
              }
            },
            { text : _("common.cancel"),
              click : function() {
                  $(this).dialog("close");
              }
            }]
        });

        $("#generate_signing_key").click(function() {
            $.get(action("available_tokens"), null, function(response) {
                $("#generate_signing_key_dialog #token_id").html("");

                $.each(response.data, function(idx, val) {
                    var option = $("<option>")
                        .attr("value", val.id).text(val.label);

                    if (val.inactive) {
                        option.addClass("inactive");
                    }

                    $("#generate_signing_key_dialog #token_id").append(option);
                });
            }, "json");

            $("#generate_signing_key_dialog").dialog("open");
        });

        $("#activate_signing_key").click(function() {
            var keyData = oSigningKeys.getFocusData();
            var params = {
                id: keyData.id
            };

            var confirmParams = {
                key_id: keyData.key_id
            };

            confirm(tr_prefix + "activate_signing_key_confirm", confirmParams, function() {
                $.post(action("activate_signing_key"), params, function(response) {
                    refreshWithData(response.data);
                    SDSB_PERIODIC_JOBS.refreshAlerts();
                }, "json");
            });
        });

        $("#delete_signing_key").click(function() {
            var keyData = oSigningKeys.getFocusData();
            var params = {
                id: keyData.id
            };

            var confirmParams = {
                key_id: keyData.key_id
            };
            confirm(tr_prefix + "delete_signing_key_confirm", confirmParams, function() {
                $.post(action("delete_signing_key"), params, function(response) {
                    refreshWithData(response.data);
                }, "json");
            });
        });

        $("#signing_keys").on("click", ".login", function() {
            activateToken($(this).data("token_id"), refresh);
        });

        $("#signing_keys").on("click", ".logout", function() {
            deactivateToken($(this).data("token_id"), refresh);
        });
    }

    function initConfPartsActions() {
        $("#upload_conf_part_dialog").initDialog({
            autoOpen: false,
            modal: true,
            height: 200,
            width: 500,
            open: function() {
                var confPart = oConfParts.getFocusData();

                $("#source_type", this).val(getSourceType());
                $("#content_identifier", this).val(confPart.content_identifier);
                $("#part_file_name", this).val(confPart.file_name);
            },
            buttons: [
            { text: _("common.upload"),
              id: "upload_conf_part_submit",
              disabled: "disabled",
              click: function() {
                  $("#upload_conf_part_form").submit();
              }
            },
            { text: _("common.cancel"),
              click: function() {
                  $(this).dialog("close");
              }
            }]
        });

        $("#conf_part_file").change(function() {
            if ($(this).val() != "") {
                $("#upload_conf_part_submit").enable();
            }
        });

        $("#upload_conf_part").click(function() {
            $("#conf_part_file").val("");
            $("#upload_conf_part_dialog").dialog("open");
        });

        $("#download_conf_part").click(function() {
            var confPart = oConfParts.getFocusData();

            window.location = action("download_conf_part") +
                "?content_identifier=" + confPart.content_identifier;
        });
    }

    function refresh() {
        var params = {
            source_type: getSourceType()
        };

        $.get(action("source"), params, function(response) {
            refreshWithData(response.data);
        }, "json");
    }

    function refreshWithData(data) {
        var anchor_file_not_found = __("anchor_file_not_found");

        if (data.anchor_file_hash) {
            $("#download_source_anchor").enable();
        } else {
            $("#download_source_anchor").disable();
        }

        $(".anchor-hash", tab).text(
            data.anchor_file_hash || anchor_file_not_found);
        $(".anchor-generated_at", tab).text(
            data.anchor_generated_at || anchor_file_not_found);
        $("#conf_url", tab).text(data.download_url || "");

        oSigningKeys.fnReplaceData(data.keys);
        oConfParts.fnReplaceData(data.parts);

        enableActions();
    }

    $(document).ready(function() {
        initSourceTables();
        initSourceAnchorActions();
        initSigningKeysActions();
        initConfPartsActions();
    });

    return {
        refresh: refresh,
        uploadCallback: uploadCallback
    };
}();